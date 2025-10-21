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
    const { days = '30', boardId, vendorId } = req.query
    const daysNum = parseInt(days as string)
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - daysNum)

    const where: any = {
      createdById: session.user.id,
      date: { gte: startDate }
    }

    if (boardId) where.boardId = boardId as string
    if (vendorId) where.vendorId = vendorId as string

    // Get all expenses
    const expenses = await prisma.expense.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            title: true
          }
        },
        board: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Calculate totals
    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0)
    const avgExpense = expenses.length > 0 ? totalSpent / expenses.length : 0

    // Group by category
    const byCategory = expenses.reduce((acc: any, exp) => {
      const cat = exp.category || 'Uncategorized'
      if (!acc[cat]) {
        acc[cat] = { total: 0, count: 0 }
      }
      acc[cat].total += exp.amount
      acc[cat].count += 1
      return acc
    }, {})

    // Group by vendor
    const byVendor = expenses.reduce((acc: any, exp) => {
      const vendorName = exp.vendor?.title || exp.aiVendorName || 'Unknown'
      if (!acc[vendorName]) {
        acc[vendorName] = { total: 0, count: 0, vendorId: exp.vendorId }
      }
      acc[vendorName].total += exp.amount
      acc[vendorName].count += 1
      return acc
    }, {})

    // Top vendors
    const topVendors = Object.entries(byVendor)
      .map(([name, data]: [string, any]) => ({
        name,
        total: data.total,
        count: data.count,
        vendorId: data.vendorId
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    // Spending by day
    const spendingByDay = expenses.reduce((acc: any, exp) => {
      const date = exp.date.toISOString().split('T')[0]
      acc[date] = (acc[date] || 0) + exp.amount
      return acc
    }, {})

    // Get active budgets
    const now = new Date()
    const activeBudgets = await prisma.budget.findMany({
      where: {
        createdById: session.user.id,
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
        ]
      }
    })

    // Calculate budget usage
    const budgetStatus = await Promise.all(
      activeBudgets.map(async (budget) => {
        const budgetExpenses = await prisma.expense.findMany({
          where: {
            date: {
              gte: budget.startDate,
              ...(budget.endDate ? { lte: budget.endDate } : {})
            },
            ...(budget.boardId ? { boardId: budget.boardId } : {}),
            ...(budget.vendorId ? { vendorId: budget.vendorId } : {}),
            ...(budget.category ? { category: budget.category } : {})
          }
        })

        const spent = budgetExpenses.reduce((sum, exp) => sum + exp.amount, 0)
        const percentUsed = budget.amount > 0 ? (spent / budget.amount) * 100 : 0

        return {
          id: budget.id,
          name: budget.name,
          amount: budget.amount,
          spent,
          remaining: budget.amount - spent,
          percentUsed: Math.round(percentUsed * 10) / 10,
          isOverBudget: spent > budget.amount
        }
      })
    )

    return res.status(200).json({
      summary: {
        totalSpent,
        avgExpense: Math.round(avgExpense * 100) / 100,
        expenseCount: expenses.length,
        daysAnalyzed: daysNum
      },
      byCategory,
      topVendors,
      spendingByDay,
      budgetStatus,
      recentExpenses: expenses.slice(0, 10)
    })
  } catch (error) {
    console.error('Error fetching expense analytics:', error)
    return res.status(500).json({ error: 'Failed to fetch analytics' })
  }
}
