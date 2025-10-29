import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Admin access required' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { boardId, period } = req.query

    // Build date range based on period
    let startDate = new Date()
    let endDate = new Date()
    
    switch (period) {
      case 'month':
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 1)
        break
      case 'quarter':
        const quarter = Math.floor(startDate.getMonth() / 3)
        startDate = new Date(startDate.getFullYear(), quarter * 3, 1)
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 3)
        break
      case 'year':
        startDate = new Date(startDate.getFullYear(), 0, 1)
        endDate = new Date(startDate.getFullYear() + 1, 0, 1)
        break
      default:
        // Default to current quarter
        const currentQuarter = Math.floor(new Date().getMonth() / 3)
        startDate = new Date(new Date().getFullYear(), currentQuarter * 3, 1)
        endDate = new Date(startDate)
        endDate.setMonth(endDate.getMonth() + 3)
    }

    // Get user's boards
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true }
    })
    const boardIds = userBoards.map(b => b.boardId)

    const budgetWhere: any = {
      boardId: boardId ? (boardId as string) : { in: boardIds },
      startDate: { lte: endDate },
      OR: [
        { endDate: null },
        { endDate: { gte: startDate } }
      ]
    }

    // Fetch budgets with line items and allocations
    const budgets = await prisma.budget.findMany({
      where: budgetWhere,
      include: {
        board: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        lineItems: {
          include: {
            allocations: {
              include: {
                expense: {
                  select: {
                    id: true,
                    amount: true,
                    description: true,
                    date: true,
                    category: true
                  }
                }
              }
            },
            snapshots: {
              where: {
                periodStart: { gte: startDate },
                periodEnd: { lte: endDate }
              },
              orderBy: {
                periodStart: 'desc'
              },
              take: 1
            }
          }
        }
      }
    })

    // Calculate budget vs actual by category
    const categoryMap = new Map<string, {
      category: string
      budgeted: number
      actual: number
      variance: number
      percentUsed: number
    }>()

    budgets.forEach(budget => {
      budget.lineItems.forEach(lineItem => {
        const category = lineItem.category || 'Uncategorized'
        const existing = categoryMap.get(category) || {
          category,
          budgeted: 0,
          actual: 0,
          variance: 0,
          percentUsed: 0
        }

        existing.budgeted += lineItem.plannedAmount
        
        // Sum allocations
        const allocated = lineItem.allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
        existing.actual += allocated
        
        categoryMap.set(category, existing)
      })
    })

    // Calculate variance and percent used
    const categoryBreakdown = Array.from(categoryMap.values()).map(cat => ({
      ...cat,
      variance: cat.budgeted - cat.actual,
      percentUsed: cat.budgeted > 0 ? Math.round((cat.actual / cat.budgeted) * 1000) / 10 : 0,
      status: cat.actual > cat.budgeted ? 'over' : cat.actual > cat.budgeted * 0.9 ? 'warning' : 'good'
    }))

    // Calculate totals
    const totalBudgeted = categoryBreakdown.reduce((sum, cat) => sum + cat.budgeted, 0)
    const totalActual = categoryBreakdown.reduce((sum, cat) => sum + cat.actual, 0)
    const totalVariance = totalBudgeted - totalActual
    const totalPercentUsed = totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 1000) / 10 : 0

    // Get recent expenses
    const expenseWhere: any = {
      boardId: boardId ? (boardId as string) : { in: boardIds },
      date: {
        gte: startDate,
        lte: endDate
      }
    }

    const recentExpenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        board: {
          select: {
            id: true,
            name: true
          }
        },
        lineItems: true,
        allocations: {
          include: {
            budgetLineItem: {
              select: {
                id: true,
                name: true,
                category: true
              }
            }
          }
        }
      },
      orderBy: {
        date: 'desc'
      },
      take: 10
    })

    // Get top spending categories
    const topCategories = categoryBreakdown
      .sort((a, b) => b.actual - a.actual)
      .slice(0, 5)

    const timeEntryWhere: Record<string, any> = {
      status: 'APPROVED',
      clockIn: {
        gte: startDate,
        lt: endDate,
      },
    }

    if (boardId) {
      timeEntryWhere.task = {
        boardId: boardId as string,
      }
    }

    const approvedTimeEntries = await prisma.timeEntry.findMany({
      where: timeEntryWhere,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
            boardId: true,
          },
        },
      },
    })

    const approvedMinutes = approvedTimeEntries.reduce((sum, entry: any) => {
      return sum + (entry.durationMinutes ?? 0)
    }, 0)

    const approvedHours = Math.round((approvedMinutes / 60) * 10) / 10

    // Group by user
    const byUser = approvedTimeEntries.reduce((acc, entry: any) => {
      const userId = entry.userId
      if (!acc[userId]) {
        acc[userId] = {
          user: entry.user,
          totalMinutes: 0,
          totalHours: 0,
          entryCount: 0,
          entries: [],
        }
      }
      acc[userId].totalMinutes += entry.durationMinutes ?? 0
      acc[userId].totalHours = Math.round((acc[userId].totalMinutes / 60) * 10) / 10
      acc[userId].entryCount += 1
      acc[userId].entries.push({
        id: entry.id,
        clockIn: entry.clockIn,
        clockOut: entry.clockOut,
        durationMinutes: entry.durationMinutes,
        task: entry.task,
        note: entry.note,
      })
      return acc
    }, {} as Record<string, any>)

    // Group by task
    const byTask = approvedTimeEntries.reduce((acc, entry: any) => {
      if (!entry.taskId) return acc
      const taskId = entry.taskId
      if (!acc[taskId]) {
        acc[taskId] = {
          task: entry.task,
          totalMinutes: 0,
          totalHours: 0,
          entryCount: 0,
          users: new Set(),
        }
      }
      acc[taskId].totalMinutes += entry.durationMinutes ?? 0
      acc[taskId].totalHours = Math.round((acc[taskId].totalMinutes / 60) * 10) / 10
      acc[taskId].entryCount += 1
      acc[taskId].users.add(entry.user.name || entry.user.email)
      return acc
    }, {} as Record<string, any>)

    // Convert to arrays and sort
    const userBreakdown = Object.values(byUser).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes)
    const taskBreakdown = Object.values(byTask).map((t: any) => ({
      ...t,
      users: Array.from(t.users),
    })).sort((a: any, b: any) => b.totalMinutes - a.totalMinutes)

    return res.status(200).json({
      period: {
        start: startDate,
        end: endDate,
        label: period || 'quarter'
      },
      summary: {
        totalBudgeted,
        totalActual,
        totalVariance,
        totalPercentUsed,
        status: totalActual > totalBudgeted ? 'over' : totalActual > totalBudgeted * 0.9 ? 'warning' : 'good'
      },
      timeTracking: {
        approvedMinutes,
        approvedHours,
        entryCount: approvedTimeEntries.length,
        byUser: userBreakdown,
        byTask: taskBreakdown,
      },
      categoryBreakdown,
      topCategories,
      recentExpenses,
      budgets: budgets.map(b => ({
        id: b.id,
        name: b.name,
        amount: b.amount,
        period: b.period,
        board: b.board,
        lineItemCount: b.lineItems.length,
        totalAllocated: b.lineItems.reduce((sum, li) => 
          sum + li.allocations.reduce((s, a) => s + a.amount, 0), 0
        )
      }))
    })
  } catch (error) {
    console.error('Error fetching financial dashboard:', error)
    return res.status(500).json({ error: 'Failed to fetch financial data' })
  }
}
