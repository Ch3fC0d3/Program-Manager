import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { calculateDurationMinutes } from '@/lib/time-entry'

async function getActiveEntry(userId: string) {
  return prisma.timeEntry.findFirst({
    where: {
      userId,
      clockOut: null,
      source: 'CLOCK',
    },
  })
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const userId = session.user.id

  if (req.method === 'GET') {
    try {
      const entry = await getActiveEntry(userId)
      return res.status(200).json(entry)
    } catch (error) {
      console.error('Error fetching active clock entry:', error)
      return res.status(500).json({ error: 'Failed to fetch active clock entry' })
    }
  }

  if (req.method === 'POST') {
    try {
      const existing = await getActiveEntry(userId)
      if (existing) {
        return res.status(409).json({ error: 'Existing clock-in must be ended before starting a new one' })
      }

      const { clockIn, taskId, note, location } = req.body || {}

      const start = clockIn ? new Date(clockIn) : new Date()
      if (Number.isNaN(start.getTime())) {
        return res.status(400).json({ error: 'Invalid clockIn timestamp' })
      }

      const entry = await prisma.timeEntry.create({
        data: {
          userId,
          taskId: typeof taskId === 'string' && taskId.length > 0 ? taskId : null,
          // Keep legacy startedAt/endedAt/minutes in sync with new clock fields
          startedAt: start,
          endedAt: null,
          minutes: null,
          clockIn: start,
          clockOut: null,
          breakMinutes: 0,
          durationMinutes: null,
          status: 'PENDING',
          source: 'CLOCK',
          note: note ? String(note) : null,
          location: location && typeof location === 'object' ? location : null,
        },
      })

      await prisma.timeEntryAudit.create({
        data: {
          timeEntryId: entry.id,
          actorId: userId,
          action: 'CLOCK_IN',
          changes: {
            clockIn: entry.clockIn,
            taskId: entry.taskId,
            note: entry.note,
            location: entry.location,
          },
        },
      })

      return res.status(201).json(entry)
    } catch (error) {
      console.error('Error starting clock entry:', error)
      return res.status(500).json({ error: 'Failed to start clock entry' })
    }
  }

  if (req.method === 'PATCH') {
    try {
      const { clockOut, breakMinutes = 0, note, taskId } = req.body || {}

      const entry = await getActiveEntry(userId)
      if (!entry) {
        return res.status(404).json({ error: 'No active clock entry found' })
      }

      const end = clockOut ? new Date(clockOut) : new Date()
      if (Number.isNaN(end.getTime())) {
        return res.status(400).json({ error: 'Invalid clockOut timestamp' })
      }

      const clockStart: Date | null = (entry.clockIn as Date | null) ?? (entry.startedAt as Date | null)
      if (!clockStart) {
        return res.status(400).json({ error: 'Unable to determine start time for time entry' })
      }

      const durationMinutes = calculateDurationMinutes(clockStart, end, breakMinutes)
      if (durationMinutes === null) {
        return res.status(400).json({ error: 'Unable to determine duration for time entry' })
      }

      const updated = await prisma.timeEntry.update({
        where: { id: entry.id },
        data: {
          // Keep legacy fields aligned when clocking out
          endedAt: end,
          minutes: durationMinutes,
          clockOut: end,
          breakMinutes: typeof breakMinutes === 'number' ? breakMinutes : 0,
          durationMinutes,
          note: note !== undefined ? (note ? String(note) : null) : entry.note,
          taskId: typeof taskId === 'string' && taskId.length > 0 ? taskId : entry.taskId,
        },
      })

      await prisma.timeEntryAudit.create({
        data: {
          timeEntryId: entry.id,
          actorId: userId,
          action: 'CLOCK_OUT',
          changes: {
            clockOut: updated.clockOut,
            breakMinutes: updated.breakMinutes,
            durationMinutes: updated.durationMinutes,
            note: updated.note,
            taskId: updated.taskId,
          },
        },
      })

      return res.status(200).json(updated)
    } catch (error) {
      console.error('Error ending clock entry:', error)
      return res.status(500).json({ error: 'Failed to end clock entry' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
