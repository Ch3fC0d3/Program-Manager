import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid notification ID' })
  }

  // Verify notification belongs to user
  const notification = await prisma.notification.findUnique({
    where: { id }
  })

  if (!notification || notification.userId !== session.user.id) {
    return res.status(404).json({ error: 'Notification not found' })
  }

  if (req.method === 'PATCH') {
    try {
      const { read } = req.body

      const updated = await prisma.notification.update({
        where: { id },
        data: { read }
      })

      return res.status(200).json(updated)
    } catch (error) {
      console.error('Error updating notification:', error)
      return res.status(500).json({ error: 'Failed to update notification' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.notification.delete({
        where: { id }
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting notification:', error)
      return res.status(500).json({ error: 'Failed to delete notification' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
