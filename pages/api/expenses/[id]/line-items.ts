import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid expense ID' })
  }

  if (req.method === 'PATCH') {
    try {
      const { lineItems } = req.body

      if (!Array.isArray(lineItems)) {
        return res.status(400).json({ error: 'Line items must be an array' })
      }

      // Delete existing line items
      await prisma.expenseLineItem.deleteMany({
        where: { expenseId: id }
      })

      // Create new line items
      const created = await prisma.expenseLineItem.createMany({
        data: lineItems.map((item: any) => ({
          expenseId: id,
          description: item.description || 'Line Item',
          quantity: item.quantity || 1,
          unitCost: item.unitCost || 0,
          totalAmount: item.totalAmount || 0,
          category: null
        }))
      })

      return res.status(200).json({ success: true, count: created.count })
    } catch (error) {
      console.error('Error updating line items:', error)
      return res.status(500).json({ 
        error: 'Failed to update line items',
        details: error instanceof Error ? error.message : 'Unknown error'
      })
    }
  }

  res.setHeader('Allow', 'PATCH')
  return res.status(405).json({ error: 'Method not allowed' })
}
