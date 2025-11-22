import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { NotificationFrequency, NotificationType } from '@prisma/client'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      // Get user notification preferences
      const preferences = await prisma.notificationPreference.findMany({
        where: { userId: session.user.id },
      })

      // Convert to simple object format
      const settings = {
        emailNotifications: preferences.some(
          (p) =>
            p.emailEnabled &&
            p.notificationType !== NotificationType.WEEKLY_DIGEST
        ),
        taskReminders: preferences.some(
          (p) => p.inAppEnabled
        ),
        weeklyDigest: preferences.some(
          (p) =>
            p.notificationType === NotificationType.WEEKLY_DIGEST &&
            p.emailEnabled &&
            p.frequency === NotificationFrequency.WEEKLY
        ),
      }

      return res.status(200).json(settings)
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      return res.status(500).json({ error: 'Failed to fetch preferences' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { emailNotifications, taskReminders, weeklyDigest } = req.body as {
        emailNotifications?: boolean
        taskReminders?: boolean
        weeklyDigest?: boolean
      }

      const userId = session.user.id

      // Update or create email notification preference
      if (emailNotifications !== undefined) {
        const existing = await prisma.notificationPreference.findFirst({
          where: {
            userId,
            notificationType: NotificationType.TASK_ASSIGNED,
            boardId: null,
          },
        })

        if (existing) {
          await prisma.notificationPreference.update({
            where: { id: existing.id },
            data: {
              emailEnabled: emailNotifications,
            },
          })
        } else {
          await prisma.notificationPreference.create({
            data: {
              userId,
              notificationType: NotificationType.TASK_ASSIGNED,
              boardId: null,
              frequency: NotificationFrequency.IMMEDIATE,
              emailEnabled: emailNotifications,
              inAppEnabled: true,
            },
          })
        }
      }

      // Update or create in-app notification preference (task reminders)
      if (taskReminders !== undefined) {
        const existing = await prisma.notificationPreference.findFirst({
          where: {
            userId,
            notificationType: NotificationType.TASK_DUE_SOON,
            boardId: null,
          },
        })

        if (existing) {
          await prisma.notificationPreference.update({
            where: { id: existing.id },
            data: {
              inAppEnabled: taskReminders,
            },
          })
        } else {
          await prisma.notificationPreference.create({
            data: {
              userId,
              notificationType: NotificationType.TASK_DUE_SOON,
              boardId: null,
              frequency: NotificationFrequency.IMMEDIATE,
              emailEnabled: true,
              inAppEnabled: taskReminders,
            },
          })
        }
      }

      // Update or create weekly digest preference
      if (weeklyDigest !== undefined) {
        const existing = await prisma.notificationPreference.findFirst({
          where: {
            userId,
            notificationType: NotificationType.WEEKLY_DIGEST,
            boardId: null,
          },
        })

        const frequency = weeklyDigest
          ? NotificationFrequency.WEEKLY
          : NotificationFrequency.IMMEDIATE

        if (existing) {
          await prisma.notificationPreference.update({
            where: { id: existing.id },
            data: {
              frequency,
              emailEnabled: weeklyDigest,
            },
          })
        } else {
          await prisma.notificationPreference.create({
            data: {
              userId,
              notificationType: NotificationType.WEEKLY_DIGEST,
              boardId: null,
              frequency,
              emailEnabled: weeklyDigest,
              inAppEnabled: false,
            },
          })
        }
      }

      return res.status(200).json({ message: 'Preferences updated successfully' })
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return res.status(500).json({ error: 'Failed to update preferences' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
