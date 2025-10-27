import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { refreshParentMetadata } from '@/lib/cardIntake'
import { Prisma } from '@prisma/client'

const ELIGIBLE_STATUSES = ['INBOX', 'SUGGESTED'] as const

type EligibleStatus = (typeof ELIGIBLE_STATUSES)[number]

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
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
        intakeStatus: true,
        parentId: true,
        aiSummary: true,
        aiLabels: true,
        aiConfidence: true,
        aiSuggestedParentId: true,
        aiSuggestedLinks: true
      }
    })

    if (!card) {
      return res.status(404).json({ error: 'Card not found' })
    }

    if (!ELIGIBLE_STATUSES.includes(card.intakeStatus as EligibleStatus)) {
      return res.status(200).json({
        success: true,
        alreadyProcessed: true,
        intakeStatus: card.intakeStatus
      })
    }

    await prisma.$transaction(async (tx) => {
      await tx.task.update({
        where: { id: card.id },
        data: {
          intakeStatus: 'REJECTED',
          aiSummary: null,
          aiLabels: [],
          aiSuggestedParentId: null,
          aiSuggestedLinks: Prisma.JsonNull,
          aiConfidence: null
        }
      })

      await refreshParentMetadata(tx, card.parentId)

      await tx.activity.create({
        data: {
          taskId: card.id,
          userId: session.user.id,
          action: 'ai_suggestion_rejected',
          details: {
            aiConfidence: card.aiConfidence,
            aiSummary: card.aiSummary,
            aiLabels: card.aiLabels,
            aiSuggestedParentId: card.aiSuggestedParentId,
            aiSuggestedLinks: card.aiSuggestedLinks
          }
        }
      })
    })

    return res.status(200).json({ success: true })
  } catch (error) {
    console.error('Error rejecting AI suggestion', error)
    return res.status(500).json({ error: 'Failed to reject suggestion' })
  }
}
