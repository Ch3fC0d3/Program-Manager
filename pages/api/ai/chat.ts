import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'hf_'
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2'

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
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true }
    })

    const boardIds = userBoards.map(b => b.boardId)

    const tasks = await prisma.task.findMany({
      where: {
        boardId: { in: boardIds },
        OR: [
          { assigneeId: session.user.id },
          { creatorId: session.user.id }
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

    const response = await fetch(
      `https://api-inference.huggingface.co/models/${HF_MODEL}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json',
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
    const aiReply = hfResponse[0]?.generated_text || 'I apologize, but I could not generate a response. Please try again.'

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
