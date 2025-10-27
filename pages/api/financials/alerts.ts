import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

interface BudgetAlert {
  id: string
  budgetId: string
  budgetName: string
  budgetLineItemId?: string
  lineItemName?: string
  category: string
  plannedAmount: number
  actualAmount: number
  percentUsed: number
  variance: number
  severity: 'warning' | 'critical' | 'exceeded'
  message: string
  boardId?: string
  boardName?: string
}

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
    const { boardId, severity } = req.query

    // Get user's boards
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true }
    })
    const boardIds = userBoards.map(b => b.boardId)

    // Get active budgets
    const now = new Date()
    const budgets = await prisma.budget.findMany({
      where: {
        boardId: boardId ? (boardId as string) : { in: boardIds },
        startDate: { lte: now },
        OR: [
          { endDate: null },
          { endDate: { gte: now } }
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
            allocations: true
          }
        }
      }
    })

    const alerts: BudgetAlert[] = []

    // Check each budget and line item
    for (const budget of budgets) {
      for (const lineItem of budget.lineItems) {
        const actualAmount = lineItem.allocations.reduce((sum, a) => sum + a.amount, 0)
        const percentUsed = lineItem.plannedAmount > 0 
          ? (actualAmount / lineItem.plannedAmount) * 100 
          : 0
        const variance = lineItem.plannedAmount - actualAmount

        let severity: 'warning' | 'critical' | 'exceeded' | null = null
        let message = ''

        if (percentUsed >= 100) {
          severity = 'exceeded'
          message = `Budget exceeded by ${formatCurrency(Math.abs(variance))}`
        } else if (percentUsed >= 90) {
          severity = 'critical'
          message = `Only ${formatCurrency(variance)} remaining (${(100 - percentUsed).toFixed(1)}% left)`
        } else if (percentUsed >= 75) {
          severity = 'warning'
          message = `${percentUsed.toFixed(1)}% of budget used`
        }

        if (severity) {
          alerts.push({
            id: lineItem.id,
            budgetId: budget.id,
            budgetName: budget.name,
            budgetLineItemId: lineItem.id,
            lineItemName: lineItem.name,
            category: lineItem.category || 'Uncategorized',
            plannedAmount: lineItem.plannedAmount,
            actualAmount,
            percentUsed: Math.round(percentUsed * 10) / 10,
            variance,
            severity,
            message,
            boardId: budget.board?.id,
            boardName: budget.board?.name
          })
        }
      }

      // Also check budget-level spending
      const totalPlanned = budget.lineItems.reduce((sum, li) => sum + li.plannedAmount, 0)
      const totalActual = budget.lineItems.reduce((sum, li) => 
        sum + li.allocations.reduce((s, a) => s + a.amount, 0), 0
      )
      const budgetPercentUsed = totalPlanned > 0 ? (totalActual / totalPlanned) * 100 : 0
      const budgetVariance = totalPlanned - totalActual

      let budgetSeverity: 'warning' | 'critical' | 'exceeded' | null = null
      let budgetMessage = ''

      if (budgetPercentUsed >= 100) {
        budgetSeverity = 'exceeded'
        budgetMessage = `Overall budget exceeded by ${formatCurrency(Math.abs(budgetVariance))}`
      } else if (budgetPercentUsed >= 90) {
        budgetSeverity = 'critical'
        budgetMessage = `Overall budget ${budgetPercentUsed.toFixed(1)}% used`
      } else if (budgetPercentUsed >= 75) {
        budgetSeverity = 'warning'
        budgetMessage = `Overall budget ${budgetPercentUsed.toFixed(1)}% used`
      }

      if (budgetSeverity) {
        alerts.push({
          id: budget.id,
          budgetId: budget.id,
          budgetName: budget.name,
          category: budget.category || 'Overall',
          plannedAmount: totalPlanned,
          actualAmount: totalActual,
          percentUsed: Math.round(budgetPercentUsed * 10) / 10,
          variance: budgetVariance,
          severity: budgetSeverity,
          message: budgetMessage,
          boardId: budget.board?.id,
          boardName: budget.board?.name
        })
      }
    }

    // Filter by severity if requested
    const filteredAlerts = severity 
      ? alerts.filter(a => a.severity === severity)
      : alerts

    // Sort by severity (exceeded > critical > warning) and then by percent used
    const severityOrder = { exceeded: 3, critical: 2, warning: 1 }
    filteredAlerts.sort((a, b) => {
      const severityDiff = severityOrder[b.severity] - severityOrder[a.severity]
      if (severityDiff !== 0) return severityDiff
      return b.percentUsed - a.percentUsed
    })

    return res.status(200).json({
      alerts: filteredAlerts,
      summary: {
        total: filteredAlerts.length,
        exceeded: filteredAlerts.filter(a => a.severity === 'exceeded').length,
        critical: filteredAlerts.filter(a => a.severity === 'critical').length,
        warning: filteredAlerts.filter(a => a.severity === 'warning').length
      }
    })
  } catch (error) {
    console.error('Error fetching budget alerts:', error)
    return res.status(500).json({ error: 'Failed to fetch budget alerts' })
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount)
}
