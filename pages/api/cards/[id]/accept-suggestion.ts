import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { Prisma, CardLinkEntityType } from '@prisma/client'

const INTAKE_ELIGIBLE = ['INBOX', 'SUGGESTED'] as const

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
        title: true,
        boardId: true,
        parentId: true,
        intakeStatus: true,
        aiSummary: true,
        aiLabels: true,
        aiSuggestedParentId: true,
        aiSuggestedLinks: true,
        aiConfidence: true
      }
    })

    if (!card) {
      return res.status(404).json({ error: 'Card not found' })
    }

    if (!INTAKE_ELIGIBLE.includes(card.intakeStatus as typeof INTAKE_ELIGIBLE[number])) {
      return res.status(400).json({ error: 'Card is not awaiting AI review' })
    }

    const linksPayload = (card.aiSuggestedLinks ?? {}) as {
      vendors?: unknown
      contacts?: unknown
    }

    const vendorIds = Array.isArray(linksPayload.vendors)
      ? (linksPayload.vendors.filter((v): v is string => typeof v === 'string'))
      : []

    const contactIds = Array.isArray(linksPayload.contacts)
      ? (linksPayload.contacts.filter((v): v is string => typeof v === 'string'))
      : []

    const result = await prisma.$transaction(async (tx) => {
      const oldParentId = card.parentId
      let resolvedParentId = card.aiSuggestedParentId ?? null

      if (resolvedParentId) {
        const parent = await tx.task.findUnique({
          where: { id: resolvedParentId },
          select: {
            id: true,
            boardId: true
          }
        })

        if (!parent || parent.boardId !== card.boardId) {
          console.warn(
            'AI suggested parent rejected due to mismatch',
            JSON.stringify({
              cardId: card.id,
              suggestedParentId: resolvedParentId,
              parentExists: Boolean(parent),
              parentBoardId: parent?.boardId,
              cardBoardId: card.boardId
            })
          )
          resolvedParentId = null
        } else {
          await ensureNoCycle(tx, card.id, resolvedParentId)
        }
      }

      const validVendors = vendorIds.length
        ? await tx.vendor.findMany({
            where: {
              id: {
                in: vendorIds
              }
            },
            select: { id: true }
          })
        : []

      const validContacts = contactIds.length
        ? await tx.contact.findMany({
            where: {
              id: {
                in: contactIds
              }
            },
            select: { id: true }
          })
        : []

      if (validContacts.length) {
        await tx.contact.updateMany({
          where: {
            id: {
              in: validContacts.map((c) => c.id)
            }
          },
          data: {
            isVendor: true
          }
        })
      }

      await tx.cardLink.deleteMany({
        where: {
          cardId: card.id,
          entityType: {
            in: ['VENDOR', 'CONTACT']
          }
        }
      })

      if (validVendors.length) {
        await tx.cardLink.createMany({
          data: validVendors.map((vendor) => ({
            cardId: card.id,
            entityType: CardLinkEntityType.VENDOR,
            entityId: vendor.id
          })),
          skipDuplicates: true
        })
      }

      if (validContacts.length) {
        await tx.cardLink.createMany({
          data: validContacts.map((contact) => ({
            cardId: card.id,
            entityType: CardLinkEntityType.CONTACT,
            entityId: contact.id
          })),
          skipDuplicates: true
        })
      }

      const updatedCard = await tx.task.update({
        where: { id: card.id },
        data: {
          parentId: resolvedParentId,
          intakeStatus: 'PLACED',
          aiSummary: null,
          aiLabels: [],
          aiSuggestedParentId: null,
          aiSuggestedLinks: Prisma.DbNull,
          aiConfidence: null
        },
        select: {
          id: true
        }
      })

      await refreshParentMetadata(tx, oldParentId)
      await refreshParentMetadata(tx, resolvedParentId)

      return {
        updatedCard,
        newParentId: resolvedParentId,
        oldParentId
      }
    })

    await prisma.activity.create({
      data: {
        taskId: card.id,
        userId: session.user.id,
        action: 'ai_suggestion_accepted',
        details: {
          aiConfidence: card.aiConfidence,
          aiSummary: card.aiSummary,
          aiLabels: card.aiLabels,
          aiSuggestedParentId: card.aiSuggestedParentId
        }
      }
    })

    return res.status(200).json({ success: true, cardId: result.updatedCard.id })
  } catch (error) {
    console.error('Error accepting AI suggestion', error)
    return res.status(500).json({ error: 'Failed to accept suggestion' })
  }
}

async function ensureNoCycle(tx: Prisma.TransactionClient, taskId: string, newParentId: string | null) {
  if (!newParentId) return
  if (newParentId === taskId) {
    throw new Error('Cannot make card its own parent')
  }

  let currentId: string | null = newParentId

  while (currentId) {
    if (currentId === taskId) {
      throw new Error('Cannot create cyclic hierarchy')
    }

    const ancestor: { parentId: string | null } | null = await tx.task.findUnique({
      where: { id: currentId },
      select: { parentId: true }
    })

    if (!ancestor) {
      break
    }

    currentId = ancestor.parentId
  }
}

async function refreshParentMetadata(tx: Prisma.TransactionClient, parentId: string | null) {
  if (!parentId) return

  const childCount = await tx.task.count({
    where: {
      parentId
    }
  })

  await tx.task.update({
    where: { id: parentId },
    data: {
      childCount,
      hasChildren: childCount > 0
    }
  })
}
