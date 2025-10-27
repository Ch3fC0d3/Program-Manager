import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || ''
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2'

function formatTaskSummary(task: any) {
  const parts = [task.title]

  if (task.status) {
    parts.push(task.status.replace(/_/g, ' '))
  }

  if (task.priority) {
    parts.push(`${task.priority.toLowerCase()} priority`)
  }

  if (task.board?.name) {
    parts.push(`Board: ${task.board.name}`)
  }

  if (task.dueDate) {
    const dueDate = new Date(task.dueDate)
    parts.push(`Due ${dueDate.toLocaleDateString()}`)
  }

  return parts.filter(Boolean).join(' • ')
}

function buildFallbackReply(message: string, tasks: any[], currentUserId: string, userName?: string) {
  if (tasks.length === 0) {
    return `Hi${userName ? ` ${userName}` : ''}! I couldn't find any tasks assigned to you yet. Try creating one from the Tasks page or ask me again once you have tasks.`
  }

  const normalized = message.toLowerCase()
  const now = new Date()
  let filtered = [...tasks]
  const appliedFilters: string[] = []

  const includes = (term: string) => normalized.includes(term)

  if (includes('urgent') || includes('high priority')) {
    filtered = filtered.filter((task) => ['URGENT', 'HIGH'].includes(task.priority))
    appliedFilters.push('high priority')
  }

  if (includes('blocked')) {
    filtered = filtered.filter((task) => task.status === 'BLOCKED')
    appliedFilters.push('blocked')
  }

  if (includes('in progress')) {
    filtered = filtered.filter((task) => task.status === 'IN_PROGRESS')
    appliedFilters.push('in progress')
  }

  if (includes('completed') || includes('done')) {
    filtered = filtered.filter((task) => task.status === 'DONE')
    appliedFilters.push('completed')
  }

  if (includes('backlog')) {
    filtered = filtered.filter((task) => task.status === 'BACKLOG')
    appliedFilters.push('backlog')
  }

  if (includes('due today')) {
    filtered = filtered.filter((task) => {
      if (!task.dueDate) return false
      const due = new Date(task.dueDate)
      return due.toDateString() === now.toDateString()
    })
    appliedFilters.push('due today')
  }

  if (includes('due this week') || includes('this week')) {
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    const endOfWeek = new Date(startOfWeek)
    endOfWeek.setDate(startOfWeek.getDate() + 6)
    endOfWeek.setHours(23, 59, 59, 999)

    filtered = filtered.filter((task) => {
      if (!task.dueDate) return false
      const due = new Date(task.dueDate)
      return due >= startOfWeek && due <= endOfWeek
    })
    appliedFilters.push('due this week')
  }

  if (includes('overdue')) {
    filtered = filtered.filter((task) => {
      if (!task.dueDate) return false
      const due = new Date(task.dueDate)
      return due < now && task.status !== 'DONE'
    })
    appliedFilters.push('overdue')
  }

  if (includes('assigned to me') || includes('my tasks')) {
    filtered = filtered.filter((task) => task.assigneeId === currentUserId)
    appliedFilters.push('assigned to you')
  }

  if (includes('unassigned')) {
    filtered = filtered.filter((task) => !task.assigneeId)
    appliedFilters.push('unassigned')
  }

  if (filtered.length === 0) {
    return `I looked through your recent tasks but couldn't find anything matching "${message}". Try a different phrasing or ask me to create a new task.`
  }

  const topTasks = filtered.slice(0, 3)
  const intro = appliedFilters.length > 0
    ? `Here${userName ? ` ${userName}` : ''} are the top tasks ${appliedFilters.join(', ')}:`
    : `Here${userName ? ` ${userName}` : ''} are a few recent tasks I found:`

  const bulletList = topTasks.map((task) => `• ${formatTaskSummary(task)}`).join('\n')

  const nextSteps = includes('create') || includes('add') || includes('new task')
    ? '\n\nIf you want me to create a task, tell me the title, due date, and who should own it.'
    : ''

  return `${intro}\n${bulletList}${nextSteps}`
}

async function resolveUserId(session: any) {
  if (session.user.id) {
    return session.user.id as string
  }

  const email = session.user.email
  if (!email) {
    return null
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true }
  })

  return user?.id ?? null
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
    const { message, context } = req.body

    if (!message) {
      return res.status(400).json({ error: 'Message is required' })
    }

    // Get user's tasks for context
    const currentUserId = await resolveUserId(session)

    if (!currentUserId) {
      return res.status(403).json({ error: 'User account not found' })
    }

    const userBoards = await prisma.boardMember.findMany({
      where: { userId: currentUserId },
      select: { boardId: true }
    })

    const boardIds = userBoards
      .map((b) => b.boardId)
      .filter((id): id is string => Boolean(id))

    const tasks = await prisma.task.findMany({
      where: {
        ...(boardIds.length > 0 ? { boardId: { in: boardIds } } : {}),
        OR: [
          { assigneeId: currentUserId },
          { creatorId: currentUserId }
        ]
      },
      include: {
        board: { select: { name: true } },
        assignee: { select: { name: true } }
      },
      orderBy: { updatedAt: 'desc' },
      take: 20
    })

    const taskContext = tasks.map(t => 
      `- ${t.title} (${t.status}, ${t.priority}, Board: ${t.board.name}${t.dueDate ? `, Due: ${new Date(t.dueDate).toLocaleDateString()}` : ''})`
    ).join('\n')

    const prompt = `You are a helpful AI assistant for a project management system. Help the user manage their tasks.

Current user: ${session.user.name}

Recent tasks:
${taskContext}

User question: ${message}

Provide a helpful, concise response. If the user asks about tasks, reference specific tasks from the list above. If they ask to create a task, provide a clear summary of what should be created.`

    const fallbackReply = buildFallbackReply(message, tasks, currentUserId, session.user.name)

    let aiReply = fallbackReply

    if (HF_API_KEY) {
      try {
        const response = await fetch(
          `https://api-inference.huggingface.co/models/${HF_MODEL}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${HF_API_KEY}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              inputs: prompt,
              parameters: {
                max_new_tokens: 300,
                temperature: 0.7,
                return_full_text: false
              }
            })
          }
        )

        if (!response.ok) {
          throw new Error(`HuggingFace API error: ${response.statusText}`)
        }

        const hfResponse = await response.json()
        aiReply = (hfResponse[0]?.generated_text || fallbackReply).trim()
      } catch (hfError) {
        console.error('HF chat error, using fallback:', hfError)
        aiReply = fallbackReply
      }
    }

    return res.status(200).json({
      reply: aiReply.trim(),
      context: {
        taskCount: tasks.length,
        userName: session.user.name
      }
    })
  } catch (error: any) {
    console.error('Error in AI chat:', error)
    return res.status(500).json({ 
      error: 'Failed to process chat message',
      details: error.message 
    })
  }
}
