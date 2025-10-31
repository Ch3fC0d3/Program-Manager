import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (req.method === 'GET') {
    try {
      const messages = await prisma.message.findMany({
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        take: 50
      })

      return res.status(200).json(messages)
    } catch (error) {
      console.error('Error fetching messages:', error)
      return res.status(500).json({ error: 'Failed to fetch messages' })
    }
  }

  if (req.method === 'POST') {
    try {
      const { content } = req.body

      if (!content || typeof content !== 'string' || content.trim().length === 0) {
        return res.status(400).json({ error: 'Message content is required' })
      }

      if (content.length > 500) {
        return res.status(400).json({ error: 'Message is too long (max 500 characters)' })
      }

      const message = await prisma.message.create({
        data: {
          content: content.trim(),
          userId: user.id
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          }
        }
      })

      return res.status(201).json(message)
    } catch (error) {
      console.error('Error creating message:', error)
      return res.status(500).json({ error: 'Failed to create message' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
