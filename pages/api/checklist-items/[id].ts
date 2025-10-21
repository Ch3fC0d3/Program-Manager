import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid checklist item ID' })
  }

  // PATCH - Toggle completion
  if (req.method === 'PATCH') {
    try {
      const { completed } = req.body

      const item = await prisma.checklistItem.update({
        where: { id },
        data: { completed }
      })

      return res.status(200).json(item)
    } catch (error) {
      console.error('Error updating checklist item:', error)
      return res.status(500).json({ error: 'Failed to update checklist item' })
    }
  }

  // DELETE - Delete item
  if (req.method === 'DELETE') {
    try {
      await prisma.checklistItem.delete({
        where: { id }
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting checklist item:', error)
      return res.status(500).json({ error: 'Failed to delete checklist item' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
