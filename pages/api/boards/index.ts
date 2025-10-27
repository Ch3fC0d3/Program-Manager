import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const resolveUserId = async () => {
    if (session.user.id) {
      return session.user.id as string
    }

    const email = session.user.email
    if (!email) {
      return null
    }

    const name = session.user.name?.trim() || email.split('@')[0]

    const existingUser = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })

    if (existingUser) {
      return existingUser.id
    }

    const placeholderPassword = await bcrypt.hash(randomBytes(16).toString('hex'), 10)

    const user = await prisma.user.create({
      data: {
        email,
        name,
        password: placeholderPassword
      },
      select: { id: true }
    })

    return user.id
  }

  if (req.method === 'GET') {
    try {
      const currentUserId = await resolveUserId()

      if (!currentUserId) {
        return res.status(403).json({ error: 'User account not found' })
      }

      const boards = await prisma.board.findMany({
        where: {
          members: {
            some: {
              userId: currentUserId
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
      const { name, description, color, icon, members } = req.body

      if (!name) {
        return res.status(400).json({ error: 'Board name is required' })
      }

      const currentUserId = await resolveUserId()

      if (!currentUserId) {
        return res.status(403).json({ error: 'User account not found' })
      }

      const additionalMembers = Array.isArray(members) ? members : []
      const memberIds = new Set<string>()
      const memberCreateData: Prisma.BoardMemberUncheckedCreateWithoutBoardInput[] = [
        {
          userId: currentUserId,
          role: 'OWNER'
        }
      ]

      for (const member of additionalMembers) {
        const userId = typeof member?.userId === 'string' ? member.userId : null
        if (!userId || userId === currentUserId || memberIds.has(userId)) {
          continue
        }

        const userExists = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true }
        })

        if (!userExists) {
          continue
        }

        memberIds.add(userId)
        memberCreateData.push({
          userId,
          role: 'MEMBER'
        })
      }

      const board = await prisma.board.create({
        data: {
          name: name.trim(),
          description: description?.trim() || null,
          color: color || null,
          icon: icon || null,
          members: {
            create: memberCreateData
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
