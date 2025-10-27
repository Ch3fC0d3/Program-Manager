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

  const vendor = await prisma.vendor.findUnique({
    where: { id },
    include: {
      contact: {
        include: {
          board: { select: { id: true, name: true, color: true } },
          owner: { select: { id: true, name: true, email: true, avatar: true } },
        },
      },
    },
  })

  if (!vendor) {
    return res.status(404).json({ error: 'Vendor not found' })
  }

  if (vendor.contact?.boardId) {
    const member = await prisma.boardMember.findFirst({
      where: { boardId: vendor.contact.boardId, userId: session.user.id },
      select: { id: true },
    })

    if (!member) {
      return res.status(403).json({ error: 'Access denied' })
    }
  }

  if (req.method === 'GET') {
    return res.status(200).json(vendor)
  }

  if (req.method === 'PUT') {
    try {
      const { name, email, phone, website, notes, tags } = req.body

      const updated = await prisma.vendor.update({
        where: { id },
        data: {
          name,
          email,
          phone,
          website,
          notes,
          tags: Array.isArray(tags)
            ? tags
            : typeof tags === 'string'
              ? tags.split(',').map((tag: string) => tag.trim()).filter(Boolean)
              : undefined,
        },
        include: {
          contact: {
            include: {
              board: { select: { id: true, name: true, color: true } },
              owner: { select: { id: true, name: true, email: true, avatar: true } },
            },
          },
        },
      })

      return res.status(200).json(updated)
    } catch (error) {
      console.error('Error updating vendor:', error)
      return res.status(500).json({ error: 'Failed to update vendor' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.vendor.delete({ where: { id } })
      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting vendor:', error)
      return res.status(500).json({ error: 'Failed to delete vendor' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
