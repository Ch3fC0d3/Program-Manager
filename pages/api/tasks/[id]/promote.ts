import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { ensureBoardAccess, AccessDeniedError } from '@/lib/authz'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

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

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  try {
    // Get the task and verify it's a subtask
    const task = await prisma.task.findUnique({
      where: { id },
      select: {
        id: true,
        parentId: true,
        boardId: true,
        title: true
      }
    })

    if (!task) {
      return res.status(404).json({ error: 'Task not found' })
    }

    if (!task.parentId) {
      return res.status(400).json({ error: 'Task is not a subtask' })
    }

    // Check board access
    try {
      await ensureBoardAccess(task.boardId, user.id)
    } catch (error) {
      if (error instanceof AccessDeniedError) {
        return res.status(403).json({ error: 'Access denied' })
      }
      throw error
    }

    const oldParentId = task.parentId

    // Promote the task by removing its parent
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        parentId: null
      },
      include: {
        assignee: {
          select: {
            id: true,
            name: true,
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
        board: {
          select: {
            id: true,
            name: true
          }
        },
        subtasks: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        _count: {
          select: {
            comments: true,
            attachments: true,
            checklists: true
          }
        }
      }
    })

    // Update parent's child count
    await prisma.task.update({
      where: { id: oldParentId },
      data: {
        childCount: {
          decrement: 1
        },
        hasChildren: {
          set: await prisma.task.count({
            where: { parentId: oldParentId }
          }) > 1
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        taskId: id,
        userId: user.id,
        action: 'promoted',
        details: {
          message: `Promoted from subtask to task`,
          oldParentId
        }
      }
    })

    return res.status(200).json(updatedTask)
  } catch (error) {
    console.error('Error promoting task:', error)
    return res.status(500).json({ error: 'Failed to promote task' })
  }
}
