import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized', message: 'You must be logged in to access budget line items' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Bad Request', message: 'Budget ID is required' })
  }

  try {
    if (req.method === 'GET') {
      // Get all line items for a budget
      const budget = await prisma.budget.findUnique({
        where: { id },
        include: {
          lineItems: {
            orderBy: { createdAt: 'desc' }
          }
        }
      })

      if (!budget) {
        return res.status(404).json({ error: 'Not Found', message: 'Budget not found' })
      }

      return res.status(200).json({ lineItems: budget.lineItems || [] })
    }

    if (req.method === 'POST') {
      // Create a new line item
      const { name, notes, type, category, plannedAmount, periodStart, periodEnd } = req.body

      if (!name || plannedAmount === undefined) {
        return res.status(400).json({ 
          error: 'Bad Request', 
          message: 'Name and planned amount are required' 
        })
      }

      const lineItem = await prisma.budgetLineItem.create({
        data: {
          budgetId: id,
          name,
          notes: notes || null,
          type: type || 'CATEGORY',
          category: category || null,
          plannedAmount: parseFloat(plannedAmount),
          periodStart: periodStart ? new Date(periodStart) : new Date(),
          periodEnd: periodEnd ? new Date(periodEnd) : null
        }
      })

      return res.status(201).json(lineItem)
    }

    return res.status(405).json({ error: 'Method Not Allowed', message: `Method ${req.method} not allowed` })
  } catch (error: any) {
    console.error('Budget line items API error:', error)
    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process request' 
    })
  }
}
