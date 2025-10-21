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
      // Get user notification preferences
      const preferences = await prisma.notificationPreference.findMany({
        where: { userId: session.user.id },
      })

      // Convert to simple object format
      const settings = {
        emailNotifications: preferences.some(
          (p) => p.channel === 'EMAIL' && p.enabled
        ),
        taskReminders: preferences.some(
          (p) => p.channel === 'IN_APP' && p.enabled
        ),
        weeklyDigest: preferences.some(
          (p) => p.channel === 'EMAIL' && p.frequency === 'WEEKLY' && p.enabled
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
      const { emailNotifications, taskReminders, weeklyDigest } = req.body

      // Update or create email notification preference
      if (emailNotifications !== undefined) {
        await prisma.notificationPreference.upsert({
          where: {
            userId_channel: {
              userId: session.user.id,
              channel: 'EMAIL',
            },
          },
          create: {
            userId: session.user.id,
            channel: 'EMAIL',
            frequency: 'IMMEDIATE',
            enabled: emailNotifications,
          },
          update: {
            enabled: emailNotifications,
          },
        })
      }

      // Update or create in-app notification preference (task reminders)
      if (taskReminders !== undefined) {
        await prisma.notificationPreference.upsert({
          where: {
            userId_channel: {
              userId: session.user.id,
              channel: 'IN_APP',
            },
          },
          create: {
            userId: session.user.id,
            channel: 'IN_APP',
            frequency: 'IMMEDIATE',
            enabled: taskReminders,
          },
          update: {
            enabled: taskReminders,
          },
        })
      }

      // Update or create weekly digest preference
      if (weeklyDigest !== undefined) {
        await prisma.notificationPreference.upsert({
          where: {
            userId_channel: {
              userId: session.user.id,
              channel: 'EMAIL',
            },
          },
          create: {
            userId: session.user.id,
            channel: 'EMAIL',
            frequency: 'WEEKLY',
            enabled: weeklyDigest,
          },
          update: {
            frequency: weeklyDigest ? 'WEEKLY' : 'IMMEDIATE',
            enabled: emailNotifications ?? true,
          },
        })
      }

      return res.status(200).json({ message: 'Preferences updated successfully' })
    } catch (error) {
      console.error('Error updating notification preferences:', error)
      return res.status(500).json({ error: 'Failed to update preferences' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
