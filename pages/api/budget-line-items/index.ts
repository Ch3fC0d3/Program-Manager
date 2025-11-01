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
    return res.status(403).json({ error: 'Forbidden' })
  }

  if (req.method === 'POST') {
    try {
      const {
        budgetId,
        name,
        type = 'CATEGORY',
        category,
        vendorId,
        boardId,
        periodStart,
        periodEnd,
        plannedAmount,
        notes
      } = req.body

      if (!budgetId || !name || !periodStart || plannedAmount === undefined) {
        return res.status(400).json({ 
          error: 'Missing required fields: budgetId, name, periodStart, plannedAmount' 
        })
      }

      if (typeof plannedAmount !== 'number' || plannedAmount < 0) {
        return res.status(400).json({ error: 'Planned amount must be a non-negative number' })
      }

      // Verify budget exists
      const budget = await prisma.budget.findUnique({
        where: { id: budgetId },
        select: { id: true }
      })

      if (!budget) {
        return res.status(404).json({ error: 'Budget not found' })
      }

      const budgetLineItem = await prisma.budgetLineItem.create({
        data: {
          budgetId,
          name,
          type,
          category,
          vendorId,
          boardId,
          periodStart: new Date(periodStart),
          periodEnd: periodEnd ? new Date(periodEnd) : null,
          plannedAmount,
          notes
        },
        include: {
          budget: {
            select: {
              id: true,
              name: true
            }
          },
          board: {
            select: {
              id: true,
              name: true
            }
          }
        }
      })

      return res.status(201).json(budgetLineItem)
    } catch (error) {
      console.error('Failed to create budget line item:', error)
      return res.status(500).json({ 
        error: 'Failed to create budget line item',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  if (req.method === 'GET') {
    try {
      const { budgetId, category } = req.query

      const where: any = {}
      if (budgetId && typeof budgetId === 'string') {
        where.budgetId = budgetId
      }
      if (category && typeof category === 'string') {
        where.category = category
      }

      const budgetLineItems = await prisma.budgetLineItem.findMany({
        where,
        include: {
          budget: {
            select: {
              id: true,
              name: true
            }
          },
          board: {
            select: {
              id: true,
              name: true
            }
          },
          allocations: {
            include: {
              expense: {
                select: {
                  id: true,
                  amount: true
                }
              }
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return res.status(200).json(budgetLineItems)
    } catch (error) {
      console.error('Failed to fetch budget line items:', error)
      return res.status(500).json({ error: 'Failed to fetch budget line items' })
    }
  }

  res.setHeader('Allow', 'GET, POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
