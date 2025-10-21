import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // GET - List budgets with spending
  if (req.method === 'GET') {
    try {
      const { boardId, vendorId, active } = req.query

      const where: any = {
        createdById: session.user.id
      }

      if (boardId) where.boardId = boardId as string
      if (vendorId) where.vendorId = vendorId as string
      
      // Filter for active budgets
      if (active === 'true') {
        const now = new Date()
        where.startDate = { lte: now }
        where.OR = [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }

      const budgets = await prisma.budget.findMany({
        where,
        include: {
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          vendor: {
            select: {
              id: true,
              title: true
            }
          },
          createdBy: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: {
          startDate: 'desc'
        }
      })

      // Calculate spending for each budget
      const budgetsWithSpending = await Promise.all(
        budgets.map(async (budget) => {
          const expenseWhere: any = {
            date: {
              gte: budget.startDate,
              ...(budget.endDate ? { lte: budget.endDate } : {})
            }
          }

          if (budget.boardId) expenseWhere.boardId = budget.boardId
          if (budget.vendorId) expenseWhere.vendorId = budget.vendorId
          if (budget.category) expenseWhere.category = budget.category

          const expenses = await prisma.expense.findMany({
            where: expenseWhere,
            select: {
              amount: true
            }
          })

          const spent = expenses.reduce((sum, exp) => sum + exp.amount, 0)
          const remaining = budget.amount - spent
          const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

          return {
            ...budget,
            spent,
            remaining,
            percentUsed: Math.round(percentUsed * 10) / 10,
            isOverBudget: spent > budget.amount
          }
        })
      )

      return res.status(200).json(budgetsWithSpending)
    } catch (error) {
      console.error('Error fetching budgets:', error)
      return res.status(500).json({ error: 'Failed to fetch budgets' })
    }
  }

  // POST - Create budget
  if (req.method === 'POST') {
    try {
      const {
        name,
        amount,
        period = 'MONTHLY',
        category,
        boardId,
        vendorId,
        startDate,
        endDate
      } = req.body

      if (!name || !amount || amount <= 0) {
        return res.status(400).json({ error: 'Name and valid amount are required' })
      }

      if (!startDate) {
        return res.status(400).json({ error: 'Start date is required' })
      }

      const budget = await prisma.budget.create({
        data: {
          name,
          amount: parseFloat(amount),
          period,
          category: category || null,
          boardId: boardId || null,
          vendorId: vendorId || null,
          startDate: new Date(startDate),
          endDate: endDate ? new Date(endDate) : null,
          createdById: session.user.id
        },
        include: {
          board: {
            select: {
              id: true,
              name: true
            }
          },
          vendor: {
            select: {
              id: true,
              title: true
            }
          }
        }
      })

      // Log activity
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'budget_created',
          details: {
            budgetId: budget.id,
            name: budget.name,
            amount: budget.amount,
            period: budget.period
          }
        }
      })

      return res.status(201).json(budget)
    } catch (error) {
      console.error('Error creating budget:', error)
      return res.status(500).json({ error: 'Failed to create budget' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
