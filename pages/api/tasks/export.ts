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
      const { boardId } = req.query

      if (!boardId || typeof boardId !== 'string') {
        return res.status(400).json({ error: 'Board ID is required' })
      }

      // Verify access
      const member = await prisma.boardMember.findFirst({
        where: {
          boardId,
          userId: session.user.id
        }
      })

      if (!member) {
        return res.status(403).json({ error: 'Access denied' })
      }

      const tasks = await prisma.task.findMany({
        where: { boardId },
        include: {
          assignee: {
            select: {
              name: true,
              email: true
            }
          },
          creator: {
            select: {
              name: true
            }
          },
          labels: {
            include: {
              label: true
            }
          }
        }
      })

      // Convert to CSV format
      const csvRows = [
        [
          'ID',
          'Title',
          'Description',
          'Status',
          'Priority',
          'Assignee',
          'Creator',
          'Due Date',
          'Start Date',
          'Labels',
          'Created At',
          'Updated At'
        ].join(',')
      ]

      tasks.forEach(task => {
        const row = [
          task.id,
          `"${task.title.replace(/"/g, '""')}"`,
          `"${(task.description || '').replace(/"/g, '""')}"`,
          task.status,
          task.priority,
          task.assignee?.name || '',
          task.creator.name,
          task.dueDate ? new Date(task.dueDate).toISOString() : '',
          task.startDate ? new Date(task.startDate).toISOString() : '',
          `"${task.labels.map(l => l.label.name).join(', ')}"`,
          new Date(task.createdAt).toISOString(),
          new Date(task.updatedAt).toISOString()
        ]
        csvRows.push(row.join(','))
      })

      const csv = csvRows.join('\n')

      res.setHeader('Content-Type', 'text/csv')
      res.setHeader('Content-Disposition', `attachment; filename=tasks-${boardId}-${Date.now()}.csv`)
      return res.status(200).send(csv)
    } catch (error) {
      console.error('Error exporting tasks:', error)
      return res.status(500).json({ error: 'Failed to export tasks' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
