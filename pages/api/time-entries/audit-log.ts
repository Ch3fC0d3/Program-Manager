import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

const MANAGER_ROLES = new Set(['ADMIN', 'MANAGER'])

function canManageTimeEntries(role?: string | null) {
  return role ? MANAGER_ROLES.has(role) : false
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (!canManageTimeEntries(session.user.role)) {
    return res.status(403).json({ error: 'Forbidden: Only managers can view audit logs' })
  }

  // GET - Fetch audit logs
  if (req.method === 'GET') {
    try {
      const { limit = '50', userId, action, startDate, endDate } = req.query

      const where: any = {}

      if (userId && typeof userId === 'string') {
        where.OR = [
          { actorId: userId },
          {
            timeEntry: {
              userId,
            },
          },
        ]
      }

      if (action && typeof action === 'string') {
        where.action = action
      }

      if (startDate || endDate) {
        where.createdAt = {}
        if (startDate && typeof startDate === 'string') {
          where.createdAt.gte = new Date(startDate)
        }
        if (endDate && typeof endDate === 'string') {
          where.createdAt.lte = new Date(endDate)
        }
      }

      const audits = await prisma.timeEntryAudit.findMany({
        where,
        include: {
          actor: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          timeEntry: {
            select: {
              id: true,
              clockIn: true,
              clockOut: true,
              durationMinutes: true,
              status: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        take: parseInt(limit as string, 10),
      })

      return res.status(200).json(audits)
    } catch (error) {
      console.error('Error fetching audit logs:', error)
      return res.status(500).json({ error: 'Failed to fetch audit logs' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
