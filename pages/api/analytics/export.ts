import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
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

    const boardIds = userBoards.map(b => b.boardId)

    // Build query filter
    const where: any = {
      boardId: { in: boardIds },
      createdAt: { gte: startDate }
    }

    if (boardId && boardId !== 'ALL') {
      where.boardId = boardId as string
    }

    // Get tasks
    const tasks = await prisma.task.findMany({
      where,
      include: {
        board: {
          select: {
            name: true
          }
        },
        assignee: {
          select: {
            name: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate analytics
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'DONE').length
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
    const blockedTasks = tasks.filter(t => t.status === 'BLOCKED').length
    const overdueTasks = tasks.filter(t => t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'DONE').length

    // Generate CSV
    const csvRows = [
      // Header
      ['Report Generated', new Date().toISOString()],
      ['Date Range', `Last ${daysNum} days`],
      ['Board', boardId === 'ALL' ? 'All Boards' : tasks[0]?.board?.name || 'N/A'],
      [],
      ['Summary Statistics'],
      ['Total Tasks', totalTasks],
      ['Completed', completedTasks],
      ['In Progress', inProgressTasks],
      ['Blocked', blockedTasks],
      ['Overdue', overdueTasks],
      ['Completion Rate', totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}%` : '0%'],
      [],
      ['Task Details'],
      ['ID', 'Title', 'Status', 'Priority', 'Board', 'Assignee', 'Due Date', 'Created', 'Completed'],
      ...tasks.map(task => [
        task.id,
        task.title,
        task.status,
        task.priority || 'N/A',
        task.board?.name || 'N/A',
        task.assignee?.name || 'Unassigned',
        task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A',
        new Date(task.createdAt).toLocaleDateString(),
        task.status === 'DONE' ? new Date(task.updatedAt).toLocaleDateString() : 'N/A'
      ])
    ]

    // Convert to CSV string
    const csvContent = csvRows
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n')

    // Set headers for file download
    res.setHeader('Content-Type', 'text/csv')
    res.setHeader('Content-Disposition', `attachment; filename="report-${Date.now()}.csv"`)
    
    return res.status(200).send(csvContent)
  } catch (error) {
    console.error('Error exporting report:', error)
    return res.status(500).json({ error: 'Failed to export report' })
  }
}
