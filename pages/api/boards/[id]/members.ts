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

  // Verify user has access to board
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
      const members = await prisma.boardMember.findMany({
        where: { boardId: id },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      })

      return res.status(200).json(members)
    } catch (error) {
      console.error('Error fetching board members:', error)
      return res.status(500).json({ error: 'Failed to fetch board members' })
    }
  }

  if (req.method === 'POST') {
    try {
      // Authorization: Only ADMIN or OWNER can add members
      if (member.role !== 'ADMIN' && member.role !== 'OWNER') {
        return res.status(403).json({ error: 'Admin or owner access required to add members' })
      }

      const { userId, role } = req.body

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      // Check if user exists
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      // Check if already a member
      const existingMember = await prisma.boardMember.findFirst({
        where: {
          boardId: id,
          userId
        }
      })

      if (existingMember) {
        return res.status(400).json({ error: 'User is already a member of this board' })
      }

      // Add member
      const newMember = await prisma.boardMember.create({
        data: {
          boardId: id,
          userId,
          role: role || 'MEMBER'
        },
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
      })

      // Create activity log
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'added_member',
          details: {
            boardId: id,
            newMemberId: userId,
            memberName: user.name || user.email
          }
        }
      })

      return res.status(201).json(newMember)
    } catch (error) {
      console.error('Error adding board member:', error)
      return res.status(500).json({ error: 'Failed to add board member' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Authorization: Only ADMIN or OWNER can remove members
      if (member.role !== 'ADMIN' && member.role !== 'OWNER') {
        return res.status(403).json({ error: 'Admin or owner access required to remove members' })
      }

      const { userId } = req.body

      if (!userId) {
        return res.status(400).json({ error: 'User ID is required' })
      }

      // Don't allow removing yourself if you're the only admin
      if (userId === session.user.id) {
        const adminCount = await prisma.boardMember.count({
          where: {
            boardId: id,
            role: 'ADMIN'
          }
        })

        if (adminCount <= 1 && member.role === 'ADMIN') {
          return res.status(400).json({ error: 'Cannot remove the last admin from the board' })
        }
      }

      await prisma.boardMember.deleteMany({
        where: {
          boardId: id,
          userId
        }
      })

      return res.status(200).json({ message: 'Member removed successfully' })
    } catch (error) {
      console.error('Error removing board member:', error)
      return res.status(500).json({ error: 'Failed to remove board member' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
