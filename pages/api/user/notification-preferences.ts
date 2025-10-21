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
      const { boardId } = req.query

      const preferences = await prisma.notificationPreference.findMany({
        where: {
          userId: session.user.id,
          ...(boardId && { boardId: boardId as string })
        },
        include: {
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        },
        orderBy: {
          notificationType: 'asc'
        }
      })

      return res.status(200).json(preferences)
    } catch (error) {
      console.error('Error fetching notification preferences:', error)
      return res.status(500).json({ error: 'Failed to fetch preferences' })
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        notificationType,
        emailEnabled,
        inAppEnabled,
        frequency,
        quietHoursStart,
        quietHoursEnd,
        boardId
      } = req.body

      if (!notificationType) {
        return res.status(400).json({ error: 'Notification type is required' })
      }

      // Upsert preference
      const preference = await prisma.notificationPreference.upsert({
        where: {
          userId_notificationType_boardId: {
            userId: session.user.id,
            notificationType,
            boardId: boardId || null
          }
        },
        update: {
          emailEnabled: emailEnabled ?? true,
          inAppEnabled: inAppEnabled ?? true,
          frequency: frequency || 'IMMEDIATE',
          quietHoursStart,
          quietHoursEnd
        },
        create: {
          userId: session.user.id,
          notificationType,
          emailEnabled: emailEnabled ?? true,
          inAppEnabled: inAppEnabled ?? true,
          frequency: frequency || 'IMMEDIATE',
          quietHoursStart,
          quietHoursEnd,
          boardId: boardId || null
        }
      })

      return res.status(200).json(preference)
    } catch (error) {
      console.error('Error updating notification preference:', error)
      return res.status(500).json({ error: 'Failed to update preference' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { preferences } = req.body

      if (!Array.isArray(preferences)) {
        return res.status(400).json({ error: 'Preferences must be an array' })
      }

      // Batch update preferences
      const updates = await Promise.all(
        preferences.map((pref: any) =>
          prisma.notificationPreference.upsert({
            where: {
              userId_notificationType_boardId: {
                userId: session.user.id,
                notificationType: pref.notificationType,
                boardId: pref.boardId || null
              }
            },
            update: {
              emailEnabled: pref.emailEnabled ?? true,
              inAppEnabled: pref.inAppEnabled ?? true,
              frequency: pref.frequency || 'IMMEDIATE',
              quietHoursStart: pref.quietHoursStart,
              quietHoursEnd: pref.quietHoursEnd
            },
            create: {
              userId: session.user.id,
              notificationType: pref.notificationType,
              emailEnabled: pref.emailEnabled ?? true,
              inAppEnabled: pref.inAppEnabled ?? true,
              frequency: pref.frequency || 'IMMEDIATE',
              quietHoursStart: pref.quietHoursStart,
              quietHoursEnd: pref.quietHoursEnd,
              boardId: pref.boardId || null
            }
          })
        )
      )

      return res.status(200).json(updates)
    } catch (error) {
      console.error('Error batch updating preferences:', error)
      return res.status(500).json({ error: 'Failed to update preferences' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { notificationType, boardId } = req.body

      await prisma.notificationPreference.deleteMany({
        where: {
          userId: session.user.id,
          notificationType,
          boardId: boardId || null
        }
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting notification preference:', error)
      return res.status(500).json({ error: 'Failed to delete preference' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
