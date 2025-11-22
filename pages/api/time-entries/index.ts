import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { calculateDurationMinutes } from '@/lib/time-entry'

const MANAGER_ROLES = new Set(['ADMIN', 'MANAGER'])

function canManageTimeEntries(role?: string | null) {
  return role ? MANAGER_ROLES.has(role) : false
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const { status, from, to, userId, scope = 'mine' } = req.query
      const where: any = {}

      if (!canManageTimeEntries(session.user.role) || scope === 'mine') {
        where.userId = session.user.id
      } else if (typeof userId === 'string' && userId.length > 0) {
        where.userId = userId
      }

      if (typeof status === 'string' && status !== 'ALL') {
        where.status = status
      }

      if (from || to) {
        where.clockIn = {}
        if (typeof from === 'string') {
          where.clockIn.gte = new Date(from)
        }
        if (typeof to === 'string') {
          const endDate = new Date(to)
          if (!Number.isNaN(endDate.getTime())) {
            endDate.setDate(endDate.getDate() + 1)
            endDate.setMilliseconds(endDate.getMilliseconds() - 1)
          }
          where.clockIn.lte = endDate
        }
      }

      const entries = await prisma.timeEntry.findMany({
        where,
        include: {
          task: {
            select: {
              id: true,
              title: true,
              boardId: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          clockIn: 'desc',
        },
        take: 200,
      })

      return res.status(200).json(entries)
    } catch (error) {
      console.error('Error fetching time entries:', error)
      return res.status(500).json({ error: 'Failed to fetch time entries' })
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        clockIn,
        clockOut,
        breakMinutes = 0,
        note,
        taskId,
      } = req.body || {}

      if (!clockIn) {
        return res.status(400).json({ error: 'clockIn is required' })
      }

      const start = new Date(clockIn)
      const end = clockOut ? new Date(clockOut) : undefined

      const durationMinutes = calculateDurationMinutes(start, end, breakMinutes)

      const entry = await prisma.timeEntry.create({
        data: {
          userId: session.user.id,
          taskId: typeof taskId === 'string' && taskId.length > 0 ? taskId : null,
          // Keep legacy startedAt/endedAt/minutes in sync with new clockIn/clockOut fields
          startedAt: start,
          endedAt: end,
          minutes: durationMinutes ?? null,
          clockIn: start,
          clockOut: end,
          breakMinutes: typeof breakMinutes === 'number' ? breakMinutes : 0,
          durationMinutes: durationMinutes ?? null,
          status: canManageTimeEntries(session.user.role) ? 'APPROVED' : 'PENDING',
          source: 'MANUAL',
          note: note ? String(note) : null,
        },
      })

      await prisma.timeEntryAudit.create({
        data: {
          timeEntryId: entry.id,
          actorId: session.user.id,
          action: 'CREATE',
          changes: {
            clockIn: entry.clockIn,
            clockOut: entry.clockOut,
            breakMinutes: entry.breakMinutes,
            durationMinutes: entry.durationMinutes,
            note: entry.note,
            taskId: entry.taskId,
          },
        },
      })

      return res.status(201).json(entry)
    } catch (error) {
      console.error('Error creating time entry:', error)
      return res.status(500).json({ error: 'Failed to create time entry' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
