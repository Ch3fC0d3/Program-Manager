import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { BoardRole } from '@prisma/client'

const VENDORS_BOARD_NAME = 'Vendors'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let board = await prisma.board.findFirst({
      where: { name: VENDORS_BOARD_NAME },
      include: {
        members: {
          include: { user: true }
        },
        tasks: {
          where: {
            parentId: null  // Only show top-level tasks
          },
          orderBy: { createdAt: 'desc' },
          include: {
            labels: {
              include: {
                label: true
              }
            },
            comments: true,
            checklists: {
              include: {
                items: true
              }
            }
          }
        }
      }
    })

    if (!board) {
      board = await prisma.board.create({
        data: {
          name: VENDORS_BOARD_NAME,
          description: 'Vendor contacts and logistics tracking board',
          color: '#f97316',
          members: {
            create: [{
              userId: session.user.id,
              role: BoardRole.OWNER
            }]
          }
        },
        include: {
          members: {
            include: { user: true }
          },
          tasks: {
            where: {
              parentId: null  // Only show top-level tasks
            },
            orderBy: { createdAt: 'desc' },
            include: {
              labels: {
                include: { label: true }
              },
              comments: true,
              checklists: {
                include: { items: true }
              }
            }
          }
        }
      })
    } else {
      const isMember = board.members.some((member) => member.userId === session.user.id)

      if (!isMember) {
        await prisma.boardMember.create({
          data: {
            boardId: board.id,
            userId: session.user.id,
            role: BoardRole.MEMBER
          }
        })

        board = await prisma.board.findUnique({
          where: { id: board.id },
          include: {
            members: {
              include: { user: true }
            },
            tasks: {
              where: {
                parentId: null  // Only show top-level tasks
              },
              orderBy: { createdAt: 'desc' },
              include: {
                labels: {
                  include: { label: true }
                },
                comments: true,
                checklists: {
                  include: { items: true }
                }
              }
            }
          }
        })
      }
    }

    return res.status(200).json(board)
  } catch (error) {
    console.error('Error fetching vendors board:', error)
    return res.status(500).json({ error: 'Failed to load vendors board' })
  }
}
