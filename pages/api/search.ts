import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const { q } = req.query

      if (!q || typeof q !== 'string') {
        return res.status(400).json({ error: 'Search query is required' })
      }

      // Get user's boards
      const userBoards = await prisma.boardMember.findMany({
        where: { userId: session.user.id },
        select: { boardId: true }
      })

      const boardIds = userBoards.map(b => b.boardId)

      // Search tasks
      const tasks = await prisma.task.findMany({
        where: {
          boardId: { in: boardIds },
          OR: [
            { title: { contains: q, mode: 'insensitive' } },
            { description: { contains: q, mode: 'insensitive' } }
          ]
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
              avatar: true
            }
          },
          labels: {
            include: {
              label: true
            }
          }
        },
        take: 20,
        orderBy: {
          updatedAt: 'desc'
        }
      })

      // Search comments
      const comments = await prisma.comment.findMany({
        where: {
          task: {
            boardId: { in: boardIds }
          },
          content: { contains: q, mode: 'insensitive' }
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              board: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          },
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        }
      })

      // Search attachments
      const attachments = await prisma.attachment.findMany({
        where: {
          task: {
            boardId: { in: boardIds }
          },
          originalName: { contains: q, mode: 'insensitive' }
        },
        include: {
          task: {
            select: {
              id: true,
              title: true,
              board: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        },
        take: 10,
        orderBy: {
          createdAt: 'desc'
        }
      })

      return res.status(200).json({
        tasks,
        comments,
        attachments
      })
    } catch (error) {
      console.error('Error searching:', error)
      return res.status(500).json({ error: 'Search failed' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
