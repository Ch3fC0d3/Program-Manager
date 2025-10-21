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
    return res.status(400).json({ error: 'Invalid board ID' })
  }

  // Check if user has access to this board
  const member = await prisma.boardMember.findFirst({
    where: {
      boardId: id,
      userId: session.user.id
    }
  })

  if (!member) {
    return res.status(403).json({ error: 'Access denied' })
  }

  if (req.method === 'GET') {
    try {
      const board = await prisma.board.findUnique({
        where: { id },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true,
                  role: true
                }
              }
            }
          },
          labels: true,
          tasks: {
            where: {
              parentId: null  // Only show top-level tasks
            },
            include: {
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
              },
              subtasks: {
                include: {
                  assignee: {
                    select: {
                      id: true,
                      name: true,
                      avatar: true
                    }
                  }
                },
                orderBy: {
                  position: 'asc'
                }
              },
              _count: {
                select: {
                  subtasks: true,
                  comments: true,
                  attachments: true
                }
              }
            },
            orderBy: {
              position: 'asc'
            }
          }
        }
      })

      if (!board) {
        return res.status(404).json({ error: 'Board not found' })
      }

      return res.status(200).json(board)
    } catch (error) {
      console.error('Error fetching board:', error)
      return res.status(500).json({ error: 'Failed to fetch board' })
    }
  }

  if (req.method === 'PUT') {
    if (!['OWNER', 'ADMIN'].includes(member.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' })
    }

    try {
      const { name, description, color, icon } = req.body

      const board = await prisma.board.update({
        where: { id },
        data: {
          name,
          description,
          color,
          icon
        }
      })

      return res.status(200).json(board)
    } catch (error) {
      console.error('Error updating board:', error)
      return res.status(500).json({ error: 'Failed to update board' })
    }
  }

  if (req.method === 'DELETE') {
    if (member.role !== 'OWNER') {
      return res.status(403).json({ error: 'Only board owner can delete' })
    }

    try {
      await prisma.board.delete({
        where: { id }
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting board:', error)
      return res.status(500).json({ error: 'Failed to delete board' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
