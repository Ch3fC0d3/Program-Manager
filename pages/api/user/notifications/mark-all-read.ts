import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    try {
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          read: false
        },
        data: {
          read: true
        }
      })

      return res.status(200).json({ message: 'All notifications marked as read' })
    } catch (error) {
      console.error('Error marking all as read:', error)
      return res.status(500).json({ error: 'Failed to mark all as read' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
