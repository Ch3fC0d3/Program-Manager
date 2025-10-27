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
    const { boardId, period, format = 'csv' } = req.query

    // Build date range
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

    // Fetch budgets with allocations
    const budgets = await prisma.budget.findMany({
      where: {
        boardId: boardId ? (boardId as string) : { in: boardIds },
        startDate: { lte: endDate },
        OR: [
          { endDate: null },
          { endDate: { gte: startDate } }
        ]
      },
      include: {
        board: {
          select: {
            id: true,
            name: true
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
            }
          }
        }
      }
    })

    if (format === 'csv') {
      // Generate CSV
      const csvRows: string[] = []
      
      // Header
      csvRows.push([
        'Budget Name',
        'Board',
        'Category',
        'Line Item',
        'Planned Amount',
        'Actual Amount',
        'Variance',
        'Percent Used',
        'Status',
        'Period Start',
        'Period End'
      ].join(','))

      // Data rows
      for (const budget of budgets) {
        for (const lineItem of budget.lineItems) {
          const actualAmount = lineItem.allocations.reduce((sum, a) => sum + a.amount, 0)
          const variance = lineItem.plannedAmount - actualAmount
          const percentUsed = lineItem.plannedAmount > 0 
            ? (actualAmount / lineItem.plannedAmount) * 100 
            : 0
          
          const status = percentUsed >= 100 ? 'Over' : percentUsed >= 90 ? 'Critical' : percentUsed >= 75 ? 'Warning' : 'Good'

          csvRows.push([
            `"${budget.name}"`,
            `"${budget.board?.name || 'N/A'}"`,
            `"${lineItem.category || 'Uncategorized'}"`,
            `"${lineItem.name}"`,
            lineItem.plannedAmount.toFixed(2),
            actualAmount.toFixed(2),
            variance.toFixed(2),
            percentUsed.toFixed(1),
            status,
            lineItem.periodStart.toISOString().split('T')[0],
            lineItem.periodEnd?.toISOString().split('T')[0] || 'N/A'
          ].join(','))
        }
      }

      const csv = csvRows.join('\n')
      const filename = `financial-report-${period || 'quarter'}-${new Date().toISOString().split('T')[0]}.csv`

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return res.status(200).send(csv)
    } else if (format === 'json') {
      // Generate JSON report
      const report = {
        generatedAt: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          label: period || 'quarter'
        },
        summary: {
          totalBudgets: budgets.length,
          totalPlanned: 0,
          totalActual: 0,
          totalVariance: 0
        },
        budgets: budgets.map(budget => {
          const lineItems = budget.lineItems.map(li => {
            const actualAmount = li.allocations.reduce((sum, a) => sum + a.amount, 0)
            const variance = li.plannedAmount - actualAmount
            const percentUsed = li.plannedAmount > 0 ? (actualAmount / li.plannedAmount) * 100 : 0

            return {
              id: li.id,
              name: li.name,
              category: li.category,
              plannedAmount: li.plannedAmount,
              actualAmount,
              variance,
              percentUsed: Math.round(percentUsed * 10) / 10,
              status: percentUsed >= 100 ? 'over' : percentUsed >= 90 ? 'critical' : percentUsed >= 75 ? 'warning' : 'good',
              allocations: li.allocations.map(alloc => ({
                amount: alloc.amount,
                expense: {
                  id: alloc.expense.id,
                  description: alloc.expense.description,
                  amount: alloc.expense.amount,
                  date: alloc.expense.date,
                  category: alloc.expense.category
                }
              }))
            }
          })

          const totalPlanned = lineItems.reduce((sum, li) => sum + li.plannedAmount, 0)
          const totalActual = lineItems.reduce((sum, li) => sum + li.actualAmount, 0)
          const totalVariance = totalPlanned - totalActual

          return {
            id: budget.id,
            name: budget.name,
            board: budget.board,
            period: budget.period,
            startDate: budget.startDate,
            endDate: budget.endDate,
            totalPlanned,
            totalActual,
            totalVariance,
            percentUsed: totalPlanned > 0 ? Math.round((totalActual / totalPlanned) * 1000) / 10 : 0,
            lineItems
          }
        })
      }

      // Calculate summary
      report.summary.totalPlanned = report.budgets.reduce((sum, b) => sum + b.totalPlanned, 0)
      report.summary.totalActual = report.budgets.reduce((sum, b) => sum + b.totalActual, 0)
      report.summary.totalVariance = report.summary.totalPlanned - report.summary.totalActual

      const filename = `financial-report-${period || 'quarter'}-${new Date().toISOString().split('T')[0]}.json`
      res.setHeader('Content-Type', 'application/json')
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`)
      return res.status(200).json(report)
    } else {
      return res.status(400).json({ error: 'Invalid format. Use csv or json.' })
    }
  } catch (error) {
    console.error('Error exporting financial report:', error)
    return res.status(500).json({ error: 'Failed to export financial report' })
  }
}
