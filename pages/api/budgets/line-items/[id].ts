import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized', message: 'You must be logged in' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Bad Request', message: 'Line item ID is required' })
  }

  try {
    if (req.method === 'PUT') {
      // Update a line item
      const { name, category, plannedAmount, type } = req.body

      const lineItem = await prisma.budgetLineItem.update({
        where: { id },
        data: {
          ...(name !== undefined && { name }),
          ...(category !== undefined && { category }),
          ...(plannedAmount !== undefined && { plannedAmount: parseFloat(plannedAmount) }),
          ...(type !== undefined && { type })
        }
      })

      return res.status(200).json(lineItem)
    }

    if (req.method === 'DELETE') {
      // Delete a line item
      await prisma.budgetLineItem.delete({
        where: { id }
      })

      return res.status(200).json({ message: 'Line item deleted successfully' })
    }

    return res.status(405).json({ error: 'Method Not Allowed', message: `Method ${req.method} not allowed` })
  } catch (error: any) {
    console.error('Line item API error:', error)
    
    if (error.code === 'P2025') {
      return res.status(404).json({ error: 'Not Found', message: 'Line item not found' })
    }

    return res.status(500).json({ 
      error: 'Internal Server Error', 
      message: process.env.NODE_ENV === 'development' ? error.message : 'Failed to process request' 
    })
  }
}
