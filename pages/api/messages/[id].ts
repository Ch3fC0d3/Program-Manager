import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, role: true }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid message ID' })
  }

  if (req.method === 'DELETE') {
    try {
      const message = await prisma.message.findUnique({
        where: { id },
        select: { userId: true }
      })

      if (!message) {
        return res.status(404).json({ error: 'Message not found' })
      }

      // Only allow user to delete their own messages, or admins can delete any
      if (message.userId !== user.id && user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Not authorized to delete this message' })
      }

      await prisma.message.delete({
        where: { id }
      })

      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('Error deleting message:', error)
      return res.status(500).json({ error: 'Failed to delete message' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
