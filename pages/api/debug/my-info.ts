import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const session = await getServerSession(req, res, authOptions)
    
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Not authenticated' })
    }

    // Get user details
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Get boards the user has access to
    const boards = await prisma.board.findMany({
      where: {
        members: {
          some: {
            userId: user.id
          }
        }
      },
      select: {
        id: true,
        name: true,
        members: {
          where: { userId: user.id },
          select: {
            role: true
          }
        }
      }
    })

    // Get task counts
    const tasksCreated = await prisma.task.count({
      where: { creatorId: user.id }
    })

    const tasksAssigned = await prisma.task.count({
      where: { assigneeId: user.id }
    })

    return res.status(200).json({
      user,
      boards: boards.map(b => ({
        id: b.id,
        name: b.name,
        role: b.members[0]?.role
      })),
      stats: {
        tasksCreated,
        tasksAssigned
      }
    })
  } catch (error: any) {
    console.error('Error:', error)
    return res.status(500).json({ error: error.message })
  } finally {
    await prisma.$disconnect()
  }
}
