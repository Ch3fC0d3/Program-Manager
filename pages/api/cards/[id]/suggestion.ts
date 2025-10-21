import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid card id' })
  }

  try {
    const card = await prisma.task.findFirst({
      where: {
        id,
        board: {
          members: {
            some: {
              userId: session.user.id
            }
          }
        }
      },
      select: {
        id: true,
        title: true,
        intakeStatus: true,
        aiSummary: true,
        aiLabels: true,
        aiSuggestedParentId: true,
        aiSuggestedLinks: true,
        aiConfidence: true,
        parentId: true,
        boardId: true,
        updatedAt: true
      }
    })

    if (!card) {
      return res.status(404).json({ error: 'Card not found' })
    }

    let suggestedParent: { id: string; title: string; parentId: string | null } | null = null

    if (card.aiSuggestedParentId) {
      suggestedParent = await prisma.task.findUnique({
        where: { id: card.aiSuggestedParentId },
        select: {
          id: true,
          title: true,
          parentId: true
        }
      })
    }

    return res.status(200).json({
      ...card,
      suggestedParent
    })
  } catch (error) {
    console.error('Error fetching card suggestion', error)
    return res.status(500).json({ error: 'Failed to fetch card suggestion' })
  }
}
