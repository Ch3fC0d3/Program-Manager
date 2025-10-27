import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import type { Prisma } from '@prisma/client'
import { sendEmail, emailTemplates } from '@/lib/email'
import { createTaskSchema, validateData } from '@/lib/validation'
import { ensureBoardAccess, getAccessibleBoardIds, AccessDeniedError } from '@/lib/authz'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const { boardId, status, assigneeId, search, parentId } = req.query

      const where: any = {}

      if (boardId && typeof boardId === 'string') {
        try {
          await ensureBoardAccess(boardId, session.user.id)
        } catch (error) {
          if (error instanceof AccessDeniedError) {
            return res.status(403).json({ error: 'Access denied' })
          }
          throw error
        }

        where.boardId = boardId
      } else {
        const accessibleBoardIds = await getAccessibleBoardIds(session.user.id)

        if (accessibleBoardIds.length === 0) {
          return res.status(200).json([])
        }

        where.boardId = {
          in: accessibleBoardIds
        }
      }

      if (status && typeof status === 'string') {
        where.status = status
      }

      if (assigneeId && typeof assigneeId === 'string') {
        where.assigneeId = assigneeId
      }

      if (search && typeof search === 'string') {
        where.OR = [
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ]
      }

      if (parentId !== undefined) {
        if (parentId === 'null' || parentId === '') {
          where.parentId = null
        } else if (typeof parentId === 'string') {
          where.parentId = parentId
        } else {
          return res.status(400).json({ error: 'Invalid parent filter' })
        }
      }

      const orderByClauses: Prisma.TaskOrderByWithRelationInput[] = [
        { position: 'asc' },
        { createdAt: 'desc' }
      ]

      const tasks = await prisma.task.findMany({
        where,
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          labels: {
            include: {
              label: true
            }
          },
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          subtasks: {
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
              position: 'asc'
            }
          },
          _count: {
            select: {
              subtasks: true,
              comments: true,
              attachments: true,
              checklists: true
            }
          }
        },
        orderBy: orderByClauses
      })

      return res.status(200).json(tasks)
    } catch (error) {
      console.error('Error fetching tasks:', error)
      return res.status(500).json({ error: 'An error occurred while fetching tasks' })
    }
  }

  if (req.method === 'POST') {
    try {
      // Validate input data
      const validation = validateData(createTaskSchema, req.body)
      if (!validation.success) {
        return res.status(400).json({ error: validation.error })
      }

      const {
        title,
        description,
        boardId,
        status,
        priority,
        assigneeId,
        dueDate,
        startDate,
        createdAt,
        labelIds,
        parentId,
        customFields
      } = validation.data

      try {
        await ensureBoardAccess(boardId, session.user.id)
      } catch (error) {
        if (error instanceof AccessDeniedError) {
          return res.status(403).json({ error: 'Access denied' })
        }
        throw error
      }

      // Get next position
      const lastTask = await prisma.task.findFirst({
        where: { boardId, status: status || 'BACKLOG' },
        orderBy: { position: 'desc' }
      })

      const position = lastTask ? lastTask.position + 1 : 0

      const task = await prisma.task.create({
        data: {
          title,
          description,
          boardId,
          creatorId: session.user.id,
          status: status || 'BACKLOG',
          priority: priority || 'MEDIUM',
          assigneeId,
          dueDate: dueDate ? new Date(dueDate) : null,
          startDate: startDate ? new Date(startDate) : null,
          parentId,
          customFields,
          position,
          ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
          labels: labelIds ? {
            create: labelIds.map((labelId: string) => ({
              labelId
            }))
          } : undefined
        },
        include: {
          assignee: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          },
          creator: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          labels: {
            include: {
              label: true
            }
          }
        }
      })

      // Create activity log
      await prisma.activity.create({
        data: {
          taskId: task.id,
          userId: session.user.id,
          action: 'created',
          details: { title }
        }
      })

      // Send notification to assignee
      if (assigneeId && assigneeId !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: assigneeId,
            type: 'TASK_ASSIGNED',
            title: 'New task assigned',
            message: `You have been assigned to "${title}"`,
            link: `/tasks/${task.id}`
          }
        })

        // Send email notification
        const assignee = await prisma.user.findUnique({
          where: { id: assigneeId },
          select: { email: true, name: true }
        })

        if (assignee?.email) {
          const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
          const emailContent = emailTemplates.taskAssigned({
            taskTitle: title,
            taskId: task.id,
            assignedBy: session.user.name || 'Someone',
            taskUrl: `${baseUrl}/tasks/${task.id}`
          })

          await sendEmail({
            to: assignee.email,
            subject: emailContent.subject,
            html: emailContent.html,
            text: emailContent.text
          }).catch(err => {
            console.error('Failed to send email notification:', err)
            // Don't fail the request if email fails
          })
        }
      }

      // Check for duplicates automatically
      const allTasks = await prisma.task.findMany({
        where: {
          boardId,
          id: { not: task.id },
          status: { not: 'DONE' },
          createdAt: {
            gte: new Date(Date.now() - 1000 * 60 * 60 * 24 * 30) // last 30 days
          }
        },
        select: {
          id: true,
          title: true,
          description: true,
          board: {
            select: {
              id: true,
              name: true,
              color: true
            }
          },
          assignee: {
            select: {
              id: true,
              name: true,
              avatar: true
            }
          },
          status: true
        }
      })

      // Calculate similarity
      const calculateSimilarity = (str1: string, str2: string): number => {
        const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 3)
        
        if (words1.length === 0 || words2.length === 0) return 0
        
        const set1 = new Set(words1)
        const set2 = new Set(words2)
        
        const intersection = new Set([...set1].filter(x => set2.has(x)))
        const union = new Set([...set1, ...set2])
        
        return intersection.size / union.size
      }

      const duplicates = allTasks
        .map(t => {
          const titleSimilarity = calculateSimilarity(title, t.title)
          const descSimilarity = description && t.description
            ? calculateSimilarity(description, t.description)
            : 0
          
          const similarity = Math.max(titleSimilarity, descSimilarity * 0.8)
          
          return { task: t, similarity }
        })
        .filter(item => item.similarity >= 0.6)
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, 5)
        .map(d => ({
          ...d.task,
          similarity: Math.round(d.similarity * 100)
        }))

      return res.status(201).json({ task, duplicates })
    } catch (error) {
      console.error('Error creating task:', error)
      return res.status(500).json({ error: 'An error occurred while creating the task' })
    }
  }

  res.setHeader('Allow', 'GET,POST')
  return res.status(405).json({ error: 'Method not allowed' })
}
