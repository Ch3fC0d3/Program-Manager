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
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  if (req.method === 'POST') {
    try {
      const { title, items } = req.body

      if (!title) {
        return res.status(400).json({ error: 'Title is required' })
      }

      const lastChecklist = await prisma.checklist.findFirst({
        where: { taskId: id },
        orderBy: { position: 'desc' }
      })

      const position = lastChecklist ? lastChecklist.position + 1 : 0

      const checklist = await prisma.checklist.create({
        data: {
          title,
          taskId: id,
          position,
          items: items ? {
            create: items.map((item: any, index: number) => ({
              text: item.text,
              completed: item.completed || false,
              position: index
            }))
          } : undefined
        },
        include: {
          items: {
            orderBy: {
              position: 'asc'
            }
          }
        }
      })

      return res.status(201).json(checklist)
    } catch (error) {
      console.error('Error creating checklist:', error)
      return res.status(500).json({ error: 'Failed to create checklist' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
