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
      const boards = await prisma.board.findMany({
        where: {
          members: {
            some: {
              userId: session.user.id
            }
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            }
          },
          _count: {
            select: {
              tasks: true
            }
          }
        },
        orderBy: {
          updatedAt: 'desc'
        }
      })

      return res.status(200).json(boards)
    } catch (error) {
      console.error('Error fetching boards:', error)
      return res.status(500).json({ error: 'Failed to fetch boards' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { name, description, color, icon } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Board name is required' })
      }

      const board = await prisma.board.create({
        data: {
          name,
          description,
          color,
          icon,
          members: {
            create: {
              userId: session.user.id,
              role: 'OWNER'
            }
          }
        },
        include: {
          members: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  avatar: true
                }
              }
            }
          }
        }
      })

      return res.status(201).json(board)
    } catch (error) {
      console.error('Error creating board:', error)
      return res.status(500).json({ error: 'Failed to create board' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
