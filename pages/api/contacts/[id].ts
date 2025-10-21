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
    const full = await prisma.contact.findUnique({
      where: { id },
      include: {
        board: { select: { id: true, name: true, color: true } },
        owner: { select: { id: true, name: true, email: true, avatar: true } }
      }
    })
    return res.status(200).json(full)
  }

  if (req.method === 'PUT') {
    try {
      const { firstName, lastName, email, phone, company, jobTitle, jobFunction, stage, boardId, ownerId, notes, tags } = req.body

      if (boardId) {
        const member = await prisma.boardMember.findFirst({
          where: { boardId, userId: session.user.id },
          select: { id: true }
        })
        if (!member) return res.status(403).json({ error: 'Access denied to target board' })
      }

      const updated = await prisma.contact.update({
        where: { id },
        data: {
          firstName,
          lastName,
          email,
          phone,
          company,
          jobTitle,
          jobFunction,
          stage,
          boardId,
          ownerId,
          notes,
          tags
        },
        include: {
          board: { select: { id: true, name: true, color: true } },
          owner: { select: { id: true, name: true, email: true, avatar: true } }
        }
      })

      return res.status(200).json(updated)
    } catch (error) {
      console.error('Error updating contact:', error)
      return res.status(500).json({ error: 'Failed to update contact' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.contact.delete({ where: { id } })
      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting contact:', error)
      return res.status(500).json({ error: 'Failed to delete contact' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
