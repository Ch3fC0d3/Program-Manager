import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  if (req.method === 'POST') {
    try {
      const { content, mentions } = req.body

      if (!content) {
        return res.status(400).json({ error: 'Content is required' })
      }

      const comment = await prisma.comment.create({
        data: {
          content,
          taskId: id,
          userId: session.user.id,
          mentions: mentions || []
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      })

      // Create activity
      await prisma.activity.create({
        data: {
          taskId: id,
          userId: session.user.id,
          action: 'commented',
          details: { preview: content.substring(0, 100) }
        }
      })

      // Send notifications to mentioned users
      if (mentions && mentions.length > 0) {
        const task = await prisma.task.findUnique({
          where: { id },
          select: { title: true }
        })

        await Promise.all(
          mentions
            .filter((userId: string) => userId !== session.user.id)
            .map((userId: string) =>
              prisma.notification.create({
                data: {
                  userId,
                  type: 'COMMENT_MENTION',
                  title: 'You were mentioned',
                  message: `${session.user.name} mentioned you in "${task?.title}"`,
                  link: `/tasks/${id}`
                }
              })
            )
        )
      }

      return res.status(201).json(comment)
    } catch (error) {
      console.error('Error creating comment:', error)
      return res.status(500).json({ error: 'Failed to create comment' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
