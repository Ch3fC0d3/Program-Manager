import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

// Simple similarity calculation using word overlap
function calculateSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  const words2 = str2.toLowerCase().split(/\s+/).filter(w => w.length > 3)
  
  if (words1.length === 0 || words2.length === 0) return 0
  
  const set1 = new Set(words1)
  const set2 = new Set(words2)
  
  const intersection = new Set([...set1].filter(x => set2.has(x)))
  const union = new Set([...set1, ...set2])
  
  return intersection.size / union.size
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { taskId, threshold = 0.6 } = req.body

    if (!taskId) {
      return res.status(400).json({ error: 'Task ID is required' })
    }

    // Get the target task
    const targetTask = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: true,
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        }
      }
    })

    if (!targetTask) {
      return res.status(404).json({ error: 'Task not found' })
    }

    // Get user's boards
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true }
    })

    const boardIds = userBoards.map(b => b.boardId)

    // Get all other tasks from user's boards
    const allTasks = await prisma.task.findMany({
      where: {
        boardId: { in: boardIds },
        id: { not: taskId },
        status: { not: 'DONE' } // Don't check completed tasks
      },
      include: {
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
        }
      }
    })

    // Calculate similarity for each task
    const duplicates = allTasks
      .map(task => {
        const titleSimilarity = calculateSimilarity(targetTask.title, task.title)
        const descSimilarity = targetTask.description && task.description
          ? calculateSimilarity(targetTask.description, task.description)
          : 0
        
        const similarity = Math.max(titleSimilarity, descSimilarity * 0.8)
        
        return {
          task,
          similarity,
          matchType: titleSimilarity > descSimilarity ? 'title' : 'description'
        }
      })
      .filter(item => item.similarity >= threshold)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, 10) // Top 10 matches

    return res.status(200).json({
      targetTask,
      duplicates: duplicates.map(d => ({
        ...d.task,
        similarity: Math.round(d.similarity * 100),
        matchType: d.matchType
      })),
      count: duplicates.length
    })
  } catch (error: any) {
    console.error('Error finding duplicates:', error)
    return res.status(500).json({ 
      error: 'Failed to find duplicates',
      details: error.message 
    })
  }
}
