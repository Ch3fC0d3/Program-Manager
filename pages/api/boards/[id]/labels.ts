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

  // Check if user has access to this board
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
      const { name, color } = req.body

      if (!name || !name.trim()) {
        return res.status(400).json({ error: 'Label name is required' })
      }

      // Check if label with same name already exists on this board
      const existingLabel = await prisma.label.findFirst({
        where: {
          boardId: id,
          name: name.trim()
        }
      })

      if (existingLabel) {
        return res.status(409).json({ error: 'Label with this name already exists' })
      }

      const label = await prisma.label.create({
        data: {
          name: name.trim(),
          color: color || '#3b82f6', // Default to blue
          boardId: id
        }
      })

      return res.status(201).json(label)
    } catch (error) {
      console.error('Error creating label:', error)
      return res.status(500).json({ error: 'Failed to create label' })
    }
  }

  if (req.method === 'GET') {
    try {
      const labels = await prisma.label.findMany({
        where: { boardId: id },
        orderBy: { name: 'asc' }
      })

      return res.status(200).json(labels)
    } catch (error) {
      console.error('Error fetching labels:', error)
      return res.status(500).json({ error: 'Failed to fetch labels' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
