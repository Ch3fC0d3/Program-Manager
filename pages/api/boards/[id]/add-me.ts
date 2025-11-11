import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id: boardId } = req.query

  if (typeof boardId !== 'string') {
    return res.status(400).json({ error: 'Invalid board ID' })
  }

  try {
    // Find the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true, name: true, email: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Check if board exists
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { 
        id: true, 
        name: true,
        members: {
          where: { userId: user.id }
        }
      }
    })

    if (!board) {
      return res.status(404).json({ error: 'Board not found' })
    }

    // Check if already a member
    if (board.members.length > 0) {
      return res.status(400).json({ error: 'You are already a member of this board' })
    }

    // Add user as a member
    await prisma.boardMember.create({
      data: {
        boardId: board.id,
        userId: user.id,
        role: 'MEMBER'
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        userId: user.id,
        action: 'SELF_ADDED_TO_BOARD',
        details: `${user.name} added themselves to board: ${board.name}`,
      }
    })

    return res.status(200).json({ 
      success: true, 
      message: `Successfully added to ${board.name}` 
    })
  } catch (error) {
    console.error('Error adding user to board:', error)
    return res.status(500).json({ error: 'Failed to add user to board' })
  }
}
