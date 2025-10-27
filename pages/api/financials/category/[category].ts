import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
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
    const { category } = req.query
    const { boardId, period } = req.query

    if (!category || typeof category !== 'string') {
      return res.status(400).json({ error: 'Category is required' })
    }

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

    // Fetch budget line items for this category
    const budgetLineItems = await prisma.budgetLineItem.findMany({
      where: {
        category: category,
        budget: budgetWhere
      },
      include: {
        budget: {
          select: {
            id: true,
            name: true,
            board: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
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
        }
      }
    })

    // Calculate totals
    let totalBudgeted = 0
    let totalActual = 0

    const lineItemSummary = budgetLineItems.map(item => {
      const actualAmount = item.allocations.reduce((sum, alloc) => sum + alloc.amount, 0)
      totalBudgeted += item.plannedAmount
      totalActual += actualAmount

      return {
        id: item.id,
        name: item.name,
        plannedAmount: item.plannedAmount,
        actualAmount,
        budgetName: item.budget.name
      }
    })

    // Fetch all expenses for this category
    const expenseWhere: any = {
      boardId: boardId ? (boardId as string) : { in: boardIds },
      category: category,
      date: {
        gte: startDate,
        lte: endDate
      }
    }

    const expenses = await prisma.expense.findMany({
      where: expenseWhere,
      include: {
        board: {
          select: {
            id: true,
            name: true
          }
        },
        attachments: {
          select: {
            id: true,
            filename: true,
            url: true,
            mimeType: true,
            size: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    const variance = totalBudgeted - totalActual
    const percentUsed = totalBudgeted > 0 ? Math.round((totalActual / totalBudgeted) * 1000) / 10 : 0
    const status = totalActual > totalBudgeted ? 'over' : totalActual > totalBudgeted * 0.9 ? 'warning' : 'good'

    return res.status(200).json({
      category,
      budgeted: totalBudgeted,
      actual: totalActual,
      variance,
      percentUsed,
      status,
      expenses,
      budgetLineItems: lineItemSummary
    })
  } catch (error) {
    console.error('Error fetching category detail:', error)
    return res.status(500).json({ error: 'Failed to fetch category detail' })
  }
}
