import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const { unreadOnly } = req.query

      const notifications = await prisma.notification.findMany({
        where: {
          userId: session.user.id,
          ...(unreadOnly === 'true' && { read: false })
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      })

      return res.status(200).json(notifications)
    } catch (error) {
      console.error('Error fetching notifications:', error)
      return res.status(500).json({ error: 'Failed to fetch notifications' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
