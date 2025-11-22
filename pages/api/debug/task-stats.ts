import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Only allow admins to hit this debug endpoint
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden' })
  }

  try {
    const totalTasks = await prisma.task.count()

    const boards = await prisma.board.findMany({
      select: {
        id: true,
        name: true,
        archivedAt: true,
        deletedAt: true,
        _count: {
          select: {
            tasks: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    })

    const sampleTasks = await prisma.task.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        title: true,
        status: true,
        boardId: true,
        parentId: true,
        hiddenFromMembers: true,
        createdAt: true,
        board: {
          select: { id: true, name: true },
        },
      },
    })

    return res.status(200).json({
      ok: true,
      totalTasks,
      boards,
      sampleTasks,
    })
  } catch (error: any) {
    console.error('task-stats debug error:', error)
    return res.status(500).json({ ok: false, error: error.message || String(error) })
  }
}
