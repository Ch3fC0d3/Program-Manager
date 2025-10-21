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

  if (req.method === 'POST') {
    try {
      // Archive the board
      const board = await prisma.board.update({
        where: { id },
        data: {
          archivedAt: new Date()
        }
      })

      // Create activity log
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'archived_board',
          details: {
            boardId: id,
            boardName: board.name
          }
        }
      })

      return res.status(200).json(board)
    } catch (error) {
      console.error('Error archiving board:', error)
      return res.status(500).json({ error: 'Failed to archive board' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      // Unarchive the board
      const board = await prisma.board.update({
        where: { id },
        data: {
          archivedAt: null
        }
      })

      // Create activity log
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'unarchived_board',
          details: {
            boardId: id,
            boardName: board.name
          }
        }
      })

      return res.status(200).json(board)
    } catch (error) {
      console.error('Error unarchiving board:', error)
      return res.status(500).json({ error: 'Failed to unarchive board' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
