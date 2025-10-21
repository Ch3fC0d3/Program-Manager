import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'

const INTAKE_STATUSES = ['INBOX', 'SUGGESTED'] as const

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { boardId } = req.query

    if (!boardId || typeof boardId !== 'string') {
      return res.status(400).json({ error: 'boardId is required' })
    }

    const membership = await prisma.boardMember.findFirst({
      where: {
        boardId,
        userId: session.user.id
      }
    })

    if (!membership) {
      return res.status(403).json({ error: 'Access denied' })
    }

    const orderBy: Prisma.TaskOrderByWithRelationInput[] = [
      { intakeStatus: 'asc' },
      { createdAt: 'asc' }
    ]

    const tasks = await prisma.task.findMany({
      where: {
        boardId,
        intakeStatus: {
          in: INTAKE_STATUSES
        }
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      },
      orderBy
    })

    return res.status(200).json(tasks)
  } catch (error) {
    console.error('Error fetching inbox cards', error)
    return res.status(500).json({ error: 'Failed to fetch inbox cards' })
  }
}
