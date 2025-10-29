import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (!id || typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid id' })
  }

  // Ensure user has access to the contact via board membership (if contact is tied to a board)
  const contact = await prisma.contact.findUnique({ where: { id } })
  if (!contact) return res.status(404).json({ error: 'Not found' })

  if (contact.boardId) {
    const member = await prisma.boardMember.findFirst({
      where: { boardId: contact.boardId, userId: session.user.id },
      select: { id: true }
    })
    if (!member) return res.status(403).json({ error: 'Access denied' })
  }

  if (req.method === 'GET') {
    const full = await loadContactPayload(id)
    if (!full) {
      return res.status(404).json({ error: 'Not found' })
    }
    return res.status(200).json(full)
  }

  if (req.method === 'PUT') {
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

      if (boardId) {
        const member = await prisma.boardMember.findFirst({
          where: { boardId, userId: session.user.id },
          select: { id: true }
        })
        if (!member) return res.status(403).json({ error: 'Access denied to target board' })
      }

      const contactClient = (prisma as any).contact

      await contactClient.update({
        where: { id },
        data: {
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
          tags: Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
              ? tags.split(',').map((t) => t.trim()).filter(Boolean)
              : undefined
        },
      })

      const full = await loadContactPayload(id)

      return res.status(200).json(full)
    } catch (error) {
      console.error('Error updating contact:', error)
      return res.status(500).json({ error: 'Failed to update contact' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.$transaction(async (tx) => {
        await tx.contactInteraction.deleteMany({ where: { contactId: id } })
        await tx.attachment.deleteMany({ where: { contactId: id } })

        const vendor = await tx.vendor.findFirst({ where: { contactId: id } })
        if (vendor) {
          await tx.cardLink.deleteMany({ where: { entityType: 'VENDOR', entityId: vendor.id } })
          await tx.vendor.delete({ where: { id: vendor.id } })
        }

        await tx.cardLink.deleteMany({ where: { entityType: 'CONTACT', entityId: id } })

        await tx.contact.delete({ where: { id } })
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting contact:', error)
      return res.status(500).json({ error: 'Failed to delete contact' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}

async function loadContactPayload(contactId: string) {
  const base = await (prisma as any).contact.findUnique({
    where: { id: contactId },
    include: {
      board: { select: { id: true, name: true, color: true } },
      owner: { select: { id: true, name: true, email: true, avatar: true } },
      attachments: {
        select: {
          id: true,
          originalName: true,
          mimeType: true,
          size: true,
          url: true,
          createdAt: true
        },
        orderBy: {
          createdAt: 'desc'
        }
      },
      vendorProfile: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          website: true,
          notes: true,
          tags: true,
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              company: true
            }
          }
        }
      }
    }
  })

  if (!base) {
    return null
  }

  let interactions: any[] = []
  const interactionsClient = (prisma as any).contactInteraction
  if (interactionsClient?.findMany) {
    try {
      interactions = await interactionsClient.findMany({
        where: { contactId },
        include: {
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        },
        orderBy: {
          occurredAt: 'desc'
        },
        take: 200
      })
    } catch (error) {
      console.error('Error loading contact interactions', error)
      interactions = []
    }
  }

  return {
    ...base,
    interactions
  }
}
