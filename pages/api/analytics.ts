import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { boardId, days = '30' } = req.query
    const daysNum = parseInt(days as string)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)

    // Get user's boards
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true }
    })

    const boardIds = boardId && typeof boardId === 'string' 
      ? [boardId] 
      : userBoards.map(b => b.boardId)

    // Total tasks
    const totalTasks = await prisma.task.count({
      where: {
        boardId: { in: boardIds },
        createdAt: { gte: startDate }
      }
    })

    // Previous period for comparison
    const prevStartDate = new Date(startDate)
    prevStartDate.setDate(prevStartDate.getDate() - daysNum)
    
    const prevTotalTasks = await prisma.task.count({
      where: {
        boardId: { in: boardIds },
        createdAt: { gte: prevStartDate, lt: startDate }
      }
    })

    // Completed tasks
    const completedTasks = await prisma.task.count({
      where: {
        boardId: { in: boardIds },
        status: 'DONE',
        updatedAt: { gte: startDate }
      }
    })

    const prevCompletedTasks = await prisma.task.count({
      where: {
        boardId: { in: boardIds },
        status: 'DONE',
        updatedAt: { gte: prevStartDate, lt: startDate }
      }
    })

    // In progress tasks
    const inProgressTasks = await prisma.task.count({
      where: {
        boardId: { in: boardIds },
        status: 'IN_PROGRESS'
      }
    })

    // Overdue tasks
    const overdueTasks = await prisma.task.count({
      where: {
        boardId: { in: boardIds },
        dueDate: { lt: new Date() },
        status: { not: 'DONE' }
      }
    })

    // Status distribution
    const statusCounts = await prisma.task.groupBy({
      by: ['status'],
      where: {
        boardId: { in: boardIds }
      },
      _count: true
    })

    const totalForPercentage = statusCounts.reduce((sum, item) => sum + item._count, 0)
    const statusDistribution = statusCounts.map(item => ({
      status: item.status,
      count: item._count,
      percentage: totalForPercentage > 0 ? Math.round((item._count / totalForPercentage) * 100) : 0
    }))

    // Priority distribution
    const priorityCounts = await prisma.task.groupBy({
      by: ['priority'],
      where: {
        boardId: { in: boardIds }
      },
      _count: true
    })

    const priorityDistribution = priorityCounts.map(item => ({
      priority: item.priority,
      count: item._count,
      percentage: totalForPercentage > 0 ? Math.round((item._count / totalForPercentage) * 100) : 0
    }))

    // Team performance
    const teamTasks = await prisma.task.groupBy({
      by: ['assigneeId'],
      where: {
        boardId: { in: boardIds },
        assigneeId: { not: null }
      },
      _count: true
    })

    const teamPerformance = await Promise.all(
      teamTasks.map(async (item) => {
        const user = await prisma.user.findUnique({
          where: { id: item.assigneeId! },
          select: { id: true, name: true, avatar: true }
        })

        const completed = await prisma.task.count({
          where: {
            boardId: { in: boardIds },
            assigneeId: item.assigneeId,
            status: 'DONE'
          }
        })

        const inProgress = await prisma.task.count({
          where: {
            boardId: { in: boardIds },
            assigneeId: item.assigneeId,
            status: 'IN_PROGRESS'
          }
        })

        return {
          userId: user?.id,
          name: user?.name || 'Unknown',
          avatar: user?.avatar,
          assigned: item._count,
          completed,
          inProgress,
          completionRate: item._count > 0 ? Math.round((completed / item._count) * 100) : 0
        }
      })
    )

    // Recent activity
    const recentActivities = await prisma.activity.findMany({
      where: {
        task: {
          boardId: { in: boardIds }
        },
        createdAt: { gte: startDate }
      },
      include: {
        user: {
          select: { name: true }
        },
        task: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    const recentActivity = recentActivities.map(activity => ({
      type: activity.action,
      userName: activity.user.name,
      action: `${activity.action} "${activity.task?.title || 'Unknown'}"`,
      timestamp: new Date(activity.createdAt).toLocaleString()
    }))

    // Calculate changes
    const tasksChange = prevTotalTasks > 0 
      ? Math.round(((totalTasks - prevTotalTasks) / prevTotalTasks) * 100) 
      : 0
    
    const completedChange = prevCompletedTasks > 0 
      ? Math.round(((completedTasks - prevCompletedTasks) / prevCompletedTasks) * 100) 
      : 0

    return res.status(200).json({
      totalTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
      tasksChange,
      completedChange,
      inProgressChange: 0,
      overdueChange: 0,
      statusDistribution,
      priorityDistribution,
      teamPerformance: teamPerformance.sort((a, b) => b.completionRate - a.completionRate),
      recentActivity
    })
  } catch (error) {
    console.error('Error fetching analytics:', error)
    return res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}
