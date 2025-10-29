import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { Prisma } from '@prisma/client'

import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { calculateDurationMinutes } from '@/lib/time-entry'

const MANAGER_ROLES = new Set(['ADMIN', 'MANAGER'])

function canManageTimeEntries(role?: string | null) {
  return role ? MANAGER_ROLES.has(role) : false
}

type TimeEntryStatusValue = 'PENDING' | 'APPROVED' | 'REJECTED'

function normalizeStatus(value: unknown): TimeEntryStatusValue | null {
  if (typeof value !== 'string') {
    return null
  }

  const upper = value.toUpperCase() as TimeEntryStatusValue
  if (upper === 'APPROVED' || upper === 'REJECTED' || upper === 'PENDING') {
    return upper
  }

  return null
}

const timeEntryReturnInclude = Prisma.validator<Prisma.TimeEntryInclude>()({
  user: {
    select: {
      id: true,
      name: true,
      email: true,
    },
  },
  approvedBy: {
    select: {
      id: true,
      name: true,
    },
  },
})

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const timeEntryId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  if (!timeEntryId) {
    return res.status(400).json({ error: 'Time entry id is required' })
  }

  // PUT - Update time entry details (manager or owner)
  if (req.method === 'PUT') {
    try {
      const body = req.body ?? {}
      const { clockIn, clockOut, breakMinutes, note, taskId } = body

      if (!clockIn) {
        return res.status(400).json({ error: 'clockIn is required' })
      }

      const existingEntry = await prisma.timeEntry.findUnique({
        where: { id: timeEntryId },
        select: { userId: true },
      })

      if (!existingEntry) {
        return res.status(404).json({ error: 'Time entry not found' })
      }

      // Only owner or manager can edit
      if (existingEntry.userId !== session.user.id && !canManageTimeEntries(session.user.role)) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const start = new Date(clockIn)
      const end = clockOut ? new Date(clockOut) : undefined
      const durationMinutes = calculateDurationMinutes(start, end, breakMinutes)

      const updatedEntry = await prisma.timeEntry.update({
        where: { id: timeEntryId },
        data: {
          clockIn: start,
          clockOut: end,
          breakMinutes: typeof breakMinutes === 'number' ? breakMinutes : 0,
          durationMinutes: durationMinutes ?? null,
          note: note ? String(note) : null,
          taskId: typeof taskId === 'string' && taskId.length > 0 ? taskId : null,
        },
        include: timeEntryReturnInclude,
      })

      await (prisma as any).timeEntryAudit.create({
        data: {
          timeEntryId,
          actorId: session.user.id,
          action: 'UPDATE',
          changes: {
            clockIn: (updatedEntry as any).clockIn,
            clockOut: (updatedEntry as any).clockOut,
            breakMinutes: (updatedEntry as any).breakMinutes,
            durationMinutes: (updatedEntry as any).durationMinutes,
            note: updatedEntry.note,
            taskId: updatedEntry.taskId,
          },
        },
      })

      return res.status(200).json(updatedEntry)
    } catch (error) {
      console.error('Error updating time entry:', error)
      return res.status(500).json({ error: 'Failed to update time entry' })
    }
  }

  // DELETE - Delete time entry (managers only)
  if (req.method === 'DELETE') {
    if (!canManageTimeEntries(session.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Only managers can delete time entries' })
    }

    try {
      const existingEntry = await prisma.timeEntry.findUnique({
        where: { id: timeEntryId },
        select: {
          id: true,
          userId: true,
          clockIn: true,
          clockOut: true,
          durationMinutes: true,
          status: true,
        },
      })

      if (!existingEntry) {
        return res.status(404).json({ error: 'Time entry not found' })
      }

      await prisma.$transaction(async (tx) => {
        // Create audit log before deletion
        await tx.timeEntryAudit.create({
          data: {
            timeEntryId,
            actorId: session.user.id,
            action: 'DELETE',
            changes: {
              userId: existingEntry.userId,
              clockIn: existingEntry.clockIn,
              clockOut: existingEntry.clockOut,
              durationMinutes: existingEntry.durationMinutes,
              status: existingEntry.status,
            },
          },
        })

        // Delete the time entry (audits will cascade delete)
        await tx.timeEntry.delete({
          where: { id: timeEntryId },
        })
      })

      return res.status(200).json({ message: 'Time entry deleted successfully' })
    } catch (error) {
      console.error('Error deleting time entry:', error)
      return res.status(500).json({ error: 'Failed to delete time entry' })
    }
  }

  // PATCH - Approve/reject time entry (managers only)
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!canManageTimeEntries(session.user.role)) {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const body = req.body ?? {}
    const status = normalizeStatus(body.status)

    if (!status || status === 'PENDING') {
      return res.status(400).json({ error: 'Status must be APPROVED or REJECTED' })
    }

    const existingEntry = await prisma.timeEntry.findUnique({
      where: { id: timeEntryId },
      select: {
        status: true,
      },
    })

    if (!existingEntry) {
      return res.status(404).json({ error: 'Time entry not found' })
    }

    const trimmedReason = typeof body.rejectedReason === 'string' ? body.rejectedReason.trim() : ''

    const rejectedReasonValue = trimmedReason.length > 0 ? trimmedReason : null

    const updateData: Prisma.TimeEntryUpdateInput = {
      status,
      approvedBy:
        status === 'APPROVED'
          ? {
              connect: { id: session.user.id },
            }
          : {
              disconnect: true,
            },
      approvedAt:
        status === 'APPROVED'
          ? new Date()
          : {
              set: null,
            },
      rejectedReason: {
        set: status === 'REJECTED' ? rejectedReasonValue : null,
      },
    }

    const result = await prisma.$transaction(async (tx) => {
      const updatedEntry = await tx.timeEntry.update({
        where: { id: timeEntryId },
        data: updateData,
        include: timeEntryReturnInclude,
      })

      await tx.timeEntryAudit.create({
        data: {
          timeEntryId,
          actorId: session.user.id,
          action: 'STATUS_CHANGE',
          changes: {
            previousStatus: existingEntry.status,
            newStatus: status,
            rejectedReason: status === 'REJECTED' ? rejectedReasonValue : null,
          },
        },
      })

      return updatedEntry
    })

    return res.status(200).json(result)
  } catch (error) {
    console.error('Error updating time entry status:', error)
    return res.status(500).json({ error: 'Failed to update time entry' })
  }
}
