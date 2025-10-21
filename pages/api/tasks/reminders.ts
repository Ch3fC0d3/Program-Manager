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
      // Get tasks due within the next 3 days
      const threeDaysFromNow = new Date()
      threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

      const tasks = await prisma.task.findMany({
        where: {
          OR: [
            { assigneeId: session.user.id },
            { creatorId: session.user.id }
          ],
          dueDate: {
            gte: new Date(),
            lte: threeDaysFromNow
          },
          status: {
            not: 'DONE'
          }
        },
        include: {
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        },
        orderBy: {
          dueDate: 'asc'
        }
      })

      return res.status(200).json(tasks)
    } catch (error) {
      console.error('Error fetching reminders:', error)
      return res.status(500).json({ error: 'Failed to fetch reminders' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
