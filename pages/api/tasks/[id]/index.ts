import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { sendEmail } from '@/lib/email'
import { ensureBoardAccess, AccessDeniedError } from '@/lib/authz'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  const task = await prisma.task.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      status: true,
      assigneeId: true,
      parentId: true,
      boardId: true,
      creatorId: true,
      description: true,
      dueDate: true,
      startDate: true
    }
  })

  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  try {
    await ensureBoardAccess(task.boardId, session.user.id)
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return res.status(403).json({ error: 'Access denied' })
    }
    throw error
  }

  if (req.method === 'GET') {
    try {
      const fullTask = await prisma.task.findUnique({
        where: { id },
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
          attachments: true,
          comments: {
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
            }
          },
          checklists: {
            include: {
              items: {
                orderBy: {
                  position: 'asc'
                }
              }
            },
            orderBy: {
              position: 'asc'
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
              },
              board: {
                select: {
                  id: true,
                  name: true,
                  color: true
                }
              },
              labels: {
                include: {
                  label: true
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
                  attachments: true
                }
              }
            },
            orderBy: {
              position: 'asc'
            }
          },
          dependencies: {
            include: {
              blockingTask: {
                select: {
                  id: true,
                  title: true,
                  status: true
                }
              }
            }
          },
          blockedBy: {
            include: {
              dependentTask: {
                select: {
                  id: true,
                  title: true,
                  status: true
                }
              }
            }
          },
          activities: {
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
            take: 20
          },
          reminders: {
            where: {
              sent: false,
              time: {
                gte: new Date()
              }
            },
            orderBy: {
              time: 'asc'
            }
          },
          board: {
            select: {
              id: true,
              name: true,
              color: true,
              labels: true
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
        }
      })

      // Fetch board members separately to include in response
      const boardMembers = await prisma.boardMember.findMany({
        where: {
          boardId: fullTask?.boardId
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true
            }
          }
        }
      })

      return res.status(200).json({
        ...fullTask,
        board: {
          ...fullTask?.board,
          members: boardMembers
        }
      })
    } catch (error) {
      console.error('Error fetching task:', error)
      return res.status(500).json({ error: 'Failed to fetch task' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const {
        title,
        description,
        status,
        priority,
        assigneeId,
        parentId,
        dueDate,
        startDate,
        estimatedHours,
        actualHours,
        customFields,
        labelIds,
        createdAt
      } = req.body

      const oldTask = task

      const updatedTask = await prisma.task.update({
        where: { id },
        data: {
          title,
          description,
          status,
          priority,
          assigneeId,
          ...(parentId !== undefined && { parentId }),
          dueDate: dueDate ? new Date(dueDate) : null,
          startDate: startDate ? new Date(startDate) : null,
          estimatedHours,
          actualHours,
          customFields,
          ...(createdAt ? { createdAt: new Date(createdAt) } : {}),
          ...(labelIds !== undefined && {
            labels: {
              deleteMany: {},
              create: labelIds.map((labelId: string) => ({
                labelId
              }))
            }
          })
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
          labels: {
            include: {
              label: true
            }
          }
        }
      })

      // Log activity
      const changes: any = {}
      if (title !== oldTask.title) changes.title = { from: oldTask.title, to: title }
      if (status !== oldTask.status) changes.status = { from: oldTask.status, to: status }
      if (assigneeId !== oldTask.assigneeId) changes.assignee = { from: oldTask.assigneeId, to: assigneeId }
      if (parentId !== undefined && parentId !== oldTask.parentId) changes.parent = { from: oldTask.parentId, to: parentId }

      if (Object.keys(changes).length > 0) {
        await prisma.activity.create({
          data: {
            taskId: id,
            userId: session.user.id,
            action: 'updated',
            details: changes
          }
        })
      }

      // Send notifications
      if (assigneeId && assigneeId !== oldTask.assigneeId && assigneeId !== session.user.id) {
        await prisma.notification.create({
          data: {
            userId: assigneeId,
            type: 'TASK_ASSIGNED',
            title: 'Task assigned to you',
            message: `You have been assigned to "${title || updatedTask.title}"`,
            link: `/tasks/${id}`
          }
        })

        // Send email notification
        if (updatedTask.assignee?.email) {
          try {
            await sendEmail({
              to: updatedTask.assignee.email,
              subject: `Task Assigned: ${updatedTask.title}`,
              html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <h2 style="color: #2563eb;">You've been assigned a task</h2>
                  <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin-top: 0;">${updatedTask.title}</h3>
                    ${updatedTask.description ? `<p style="color: #6b7280;">${updatedTask.description}</p>` : ''}
                    <div style="margin-top: 15px;">
                      <p style="margin: 5px 0;"><strong>Priority:</strong> ${updatedTask.priority}</p>
                      <p style="margin: 5px 0;"><strong>Status:</strong> ${updatedTask.status}</p>
                      ${updatedTask.dueDate ? `<p style="margin: 5px 0;"><strong>Due Date:</strong> ${new Date(updatedTask.dueDate).toLocaleDateString()}</p>` : ''}
                    </div>
                  </div>
                  <p>Assigned by: <strong>${session.user.name || session.user.email}</strong></p>
                  <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/tasks/${id}" 
                     style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-top: 20px;">
                    View Task
                  </a>
                </div>
              `
            })
          } catch (emailError) {
            console.error('Failed to send assignment email:', emailError)
            // Don't fail the request if email fails
          }
        }
      }

      if (status === 'DONE' && oldTask.status !== 'DONE') {
        // Notify creator
        if (oldTask.creatorId !== session.user.id) {
          await prisma.notification.create({
            data: {
              userId: oldTask.creatorId,
              type: 'TASK_COMPLETED',
              title: 'Task completed',
              message: `"${title}" has been marked as done`,
              link: `/tasks/${id}`
            }
          })
        }
      }

      return res.status(200).json(updatedTask)
    } catch (error) {
      console.error('Error updating task:', error)
      return res.status(500).json({ error: 'Failed to update task' })
    }
  }

  if (req.method === 'DELETE') {
    try {
      await prisma.task.delete({
        where: { id }
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting task:', error)
      return res.status(500).json({ error: 'Failed to delete task' })
    }
  }

  res.setHeader('Allow', 'GET,PUT,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
