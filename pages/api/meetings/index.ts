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
      const { boardId, upcoming, past } = req.query

      const where: any = {
        creatorId: session.user.id
      }

      if (boardId) {
        where.boardId = boardId
      }

      if (upcoming === 'true') {
        where.meetingDate = { gte: new Date() }
      }

      if (past === 'true') {
        where.meetingDate = { lt: new Date() }
      }

      const meetings = await prisma.meeting.findMany({
        where,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          tasks: {
            select: {
              id: true,
              title: true,
              status: true,
              priority: true
            }
          }
        },
        orderBy: {
          meetingDate: 'desc'
        }
      })

      return res.status(200).json(meetings)
    } catch (error: any) {
      console.error('Error fetching meetings:', error)
      return res.status(500).json({ error: 'Failed to fetch meetings' })
    }
  }

  if (req.method === 'POST') {
    try {
      const {
        title,
        description,
        notes,
        meetingDate,
        duration,
        location,
        attendees,
        tags,
        boardId,
        templateId
      } = req.body

      if (!title || !meetingDate) {
        return res.status(400).json({ error: 'Title and meeting date are required' })
      }

      const meeting = await prisma.meeting.create({
        data: {
          title,
          description: description || null,
          notes: notes || null,
          meetingDate: new Date(meetingDate),
          duration: duration || null,
          location: location || null,
          attendees: attendees || [],
          tags: tags || [],
          templateId: templateId || null,
          creatorId: session.user.id,
          boardId: boardId || null
        },
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          tasks: true
        }
      })

      return res.status(201).json(meeting)
    } catch (error: any) {
      console.error('Error creating meeting:', error)
      return res.status(500).json({ error: 'Failed to create meeting' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
