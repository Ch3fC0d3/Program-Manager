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

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid meeting ID' })
  }

  if (req.method === 'GET') {
    try {
      const meeting = await prisma.meeting.findUnique({
        where: { id },
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
            include: {
              assignee: {
                select: {
                  id: true,
                  name: true,
                  avatar: true
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          }
        }
      })

      if (!meeting) {
        return res.status(404).json({ error: 'Meeting not found' })
      }

      return res.status(200).json(meeting)
    } catch (error: any) {
      console.error('Error fetching meeting:', error)
      return res.status(500).json({ error: 'Failed to fetch meeting' })
    }
  }

  if (req.method === 'PUT') {
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
        boardId
      } = req.body

      const meeting = await prisma.meeting.update({
        where: { id },
        data: {
          title: title || undefined,
          description: description !== undefined ? description : undefined,
          notes: notes !== undefined ? notes : undefined,
          meetingDate: meetingDate ? new Date(meetingDate) : undefined,
          duration: duration !== undefined ? duration : undefined,
          location: location !== undefined ? location : undefined,
          attendees: attendees !== undefined ? attendees : undefined,
          tags: tags !== undefined ? tags : undefined,
          boardId: boardId !== undefined ? boardId : undefined
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

      return res.status(200).json(meeting)
    } catch (error: any) {
      console.error('Error updating meeting:', error)
      return res.status(500).json({ error: 'Failed to update meeting' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.meeting.delete({
        where: { id }
      })

      return res.status(200).json({ message: 'Meeting deleted successfully' })
    } catch (error: any) {
      console.error('Error deleting meeting:', error)
      return res.status(500).json({ error: 'Failed to delete meeting' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
