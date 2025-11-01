import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'

import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { updateBudgetSnapshot } from '@/lib/expense-allocator'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  const { id } = req.query

  if (typeof id !== 'string' || !id.trim()) {
    return res.status(400).json({ error: 'Invalid budget line item id' })
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.budgetLineItem.delete({
        where: { id }
      })
      return res.status(200).json({ success: true, message: 'Budget line item deleted' })
    } catch (error) {
      console.error('Failed to delete budget line item:', error)
      return res.status(500).json({ 
        error: 'Failed to delete budget line item',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  if (req.method !== 'PATCH') {
    res.setHeader('Allow', 'PATCH, DELETE')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const name = typeof req.body?.name === 'string' ? req.body.name.trim() : ''
  const plannedAmountRaw = req.body?.plannedAmount
  const plannedAmount = typeof plannedAmountRaw === 'number' ? plannedAmountRaw : Number(plannedAmountRaw)

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  if (!Number.isFinite(plannedAmount) || plannedAmount < 0) {
    return res.status(400).json({ error: 'Planned amount must be a non-negative number' })
  }

  try {
    const existing = await prisma.budgetLineItem.findUnique({
      where: { id },
      select: { id: true }
    })

    if (!existing) {
      return res.status(404).json({ error: 'Budget line item not found' })
    }

    const updated = await prisma.budgetLineItem.update({
      where: { id },
      data: {
        name,
        plannedAmount
      }
    })

    // Try to update budget snapshot, but don't fail if it errors
    try {
      await updateBudgetSnapshot(updated.id)
    } catch (snapshotError) {
      console.error('Failed to update budget snapshot (non-fatal):', snapshotError)
    }

    return res.status(200).json(updated)
  } catch (error) {
    console.error('Failed to update budget line item:', error)
    return res.status(500).json({ 
      error: 'Failed to update budget line item',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
