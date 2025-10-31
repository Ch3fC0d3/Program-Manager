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
    return res.status(403).json({ error: 'Admin access required' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { limit = '50' } = req.query

    // Get all activities and filter for user management activities
    const allActivities = await prisma.activity.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: parseInt(limit as string) * 2 // Get more to account for filtering
    })

    // Filter for user management and bug report activities
    const activityLog = allActivities
      .filter(activity => 
        !activity.taskId && 
        (activity.action.startsWith('user_') || activity.action === 'bug_reported')
      )
      .slice(0, parseInt(limit as string))

    return res.status(200).json(activityLog)
  } catch (error) {
    console.error('Error fetching activity log:', error)
    return res.status(500).json({ error: 'Failed to fetch activity log' })
  }
}
