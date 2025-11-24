import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const { boardId, stage, ownerId, search } = req.query

      const isAdmin = session.user.role === 'ADMIN'

      const where: any = {}

      if (!isAdmin) {
        // Determine which boards the user can access
        let accessibleBoardIds: string[] | undefined
        if (boardId && typeof boardId === 'string') {
          const member = await prisma.boardMember.findFirst({
            where: { boardId, userId: session.user.id },
            select: { id: true }
          })
          if (!member) {
            return res.status(403).json({ error: 'Access denied' })
          }
          accessibleBoardIds = [boardId]
        } else {
          const boards = await prisma.boardMember.findMany({
            where: { userId: session.user.id },
            select: { boardId: true }
          })
          accessibleBoardIds = boards.map(b => b.boardId)
        }

        where.OR = [
          { boardId: { in: accessibleBoardIds } },
          { boardId: null } // personal/global contacts
        ]
      } else if (boardId && typeof boardId === 'string') {
        // Admins can filter by any board without membership checks
        where.boardId = boardId
      }

      if (stage && typeof stage === 'string') {
        where.stage = stage
      }

      if (ownerId && typeof ownerId === 'string') {
        where.ownerId = ownerId
      }

      if (search && typeof search === 'string') {
        const searchConditions = [
          { firstName: { contains: search, mode: 'insensitive' } },
          { lastName: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
          { website: { contains: search, mode: 'insensitive' } },
          { company: { contains: search, mode: 'insensitive' } },
          { jobTitle: { contains: search, mode: 'insensitive' } },
          { jobFunction: { contains: search, mode: 'insensitive' } },
          { addressLine1: { contains: search, mode: 'insensitive' } },
          { addressLine2: { contains: search, mode: 'insensitive' } },
          { city: { contains: search, mode: 'insensitive' } },
          { state: { contains: search, mode: 'insensitive' } },
          { postalCode: { contains: search, mode: 'insensitive' } },
          { country: { contains: search, mode: 'insensitive' } },
          { tags: { has: search } }
        ]

        where.AND = [...(where.AND || []), { OR: searchConditions }]
      }

      const contacts = await prisma.contact.findMany({
        where,
        include: {
          board: { select: { id: true, name: true, color: true } },
          owner: { select: { id: true, name: true, email: true, avatar: true } }
        },
        orderBy: [{ updatedAt: 'desc' }]
      })

      return res.status(200).json(contacts)
    } catch (error) {
      console.error('Error fetching contacts:', error)
      return res.status(500).json({ error: 'Failed to fetch contacts' })
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        firstName,
        lastName,
        email,
        phone,
        website,
        addressLine1,
        addressLine2,
        city,
        state,
        postalCode,
        country,
        company,
        jobTitle,
        jobFunction,
        stage,
        boardId,
        ownerId,
        notes,
        tags
      } = req.body

      if (!firstName && !lastName && !email) {
        return res.status(400).json({ error: 'At least one of firstName, lastName, or email is required' })
      }

      // Verify access to board if provided
      if (boardId) {
        const member = await prisma.boardMember.findFirst({
          where: { boardId, userId: session.user.id },
          select: { id: true }
        })
        if (!member) {
          return res.status(403).json({ error: 'Access denied to target board' })
        }
      }

      const contactClient = (prisma as any).contact
      const contact = await contactClient.create({
        data: {
          firstName: firstName || '',
          lastName,
          email,
          phone,
          website,
          addressLine1,
          addressLine2,
          city,
          state,
          postalCode,
          country,
          company,
          jobTitle,
          jobFunction,
          stage: stage || 'CONTACTED',
          boardId: boardId || null,
          ownerId: ownerId || session.user.id,
          notes,
          tags: Array.isArray(tags) ? tags : [],
        },
        include: {
          board: { select: { id: true, name: true, color: true } },
          owner: { select: { id: true, name: true, email: true, avatar: true } }
        }
      })

      ;(prisma as any).activity?.create?.({
        data: {
          userId: session.user.id,
          action: 'CONTACT_CREATED',
          details: {
            contactId: contact.id,
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            stage: contact.stage,
            boardId: contact.boardId,
            ownerId: contact.ownerId,
            tags: contact.tags
          }
        }
      }).catch((logError: unknown) => {
        console.error('Failed to log contact creation activity', logError)
      })

      return res.status(201).json(contact)
    } catch (error) {
      console.error('Error creating contact:', error)
      return res.status(500).json({ error: 'Failed to create contact' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
