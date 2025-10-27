import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
const DEFAULT_LIMIT = 50
const ALLOWED_METHODS = ['CALL', 'EMAIL', 'MEETING', 'NOTE', 'OTHER'] as const

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid contact id' })
  }

  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact) {
    return res.status(404).json({ error: 'Contact not found' })
  }

  const interactionsClient = (prisma as any).contactInteraction
  const hasInteractions = Boolean(interactionsClient?.findMany)

  if (contact.boardId) {
    const member = await prisma.boardMember.findFirst({
      where: { boardId: contact.boardId, userId: session.user.id },
      select: { id: true },
    })

    if (!member) {
      return res.status(403).json({ error: 'Access denied' })
    }
  }

  if (req.method === 'GET') {
    const { limit } = req.query

    if (!hasInteractions) {
      return res.status(200).json([])
    }

    const interactions = await interactionsClient.findMany({
      where: { contactId: id },
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        occurredAt: 'desc',
      },
      take: Math.min(Number(limit ?? DEFAULT_LIMIT) || DEFAULT_LIMIT, 200),
    })

    return res.status(200).json(interactions)
  }

  if (req.method === 'POST') {
    if (!hasInteractions) {
      return res.status(501).json({ error: 'Contact interactions are not configured in this environment' })
    }

    try {
      const { method = 'NOTE', occurredAt, summary, notes } = req.body

      const normalizedMethod = String(method).toUpperCase()
      if (!ALLOWED_METHODS.includes(normalizedMethod as typeof ALLOWED_METHODS[number])) {
        return res.status(400).json({ error: 'Invalid method' })
      }

      const created = await interactionsClient.create({
        data: {
          contactId: id,
          createdById: session.user.id,
          method: normalizedMethod,
          occurredAt: occurredAt ? new Date(occurredAt) : undefined,
          summary: summary?.trim() || null,
          notes: notes?.trim() || null,
        },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
        },
      })

      return res.status(201).json(created)
    } catch (error) {
      console.error('Error creating contact interaction:', error)
      return res.status(500).json({ error: 'Failed to create interaction' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
