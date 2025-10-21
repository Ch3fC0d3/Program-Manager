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
    console.log('Extract tasks API called')
    const { 
      content, 
      boardId,
      meetingTitle,
      meetingDate,
      meetingDuration,
      meetingLocation,
      meetingAttendees
    } = req.body

    if (!content) {
      console.error('No content provided')
      return res.status(400).json({ error: 'Content is required' })
    }

    console.log('Content length:', content.length)

    // Get user's boards
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      include: {
        board: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    console.log('User boards found:', userBoards.length)

    const targetBoardId = boardId || userBoards[0]?.board.id

    if (!targetBoardId) {
      console.error('No boards available for user')
      return res.status(400).json({ error: 'No boards available. Please create a board first.' })
    }

    console.log('Target board ID:', targetBoardId)

    const prompt = `Extract action items and tasks from the following meeting notes or content. For each task, provide:
1. Title (brief, actionable)
2. Description (details)
3. Priority (URGENT, HIGH, MEDIUM, LOW)
4. Assignee name if mentioned (or null)

Meeting notes:
${content}

Respond with ONLY valid JSON in this format:
{
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "priority": "MEDIUM",
      "assignee": "name or null"
    }
  ]
}`

    console.log('Calling HuggingFace API...')
    
    let hfResponse: any = null
    try {
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
              max_new_tokens: 800,
              temperature: 0.3,
              return_full_text: false
            }
          })
        }
      )

      if (!response.ok) {
        console.warn(`HuggingFace API error: ${response.statusText}`)
        throw new Error(`HuggingFace API error: ${response.statusText}`)
      }

      hfResponse = await response.json()
      console.log('HuggingFace response received')
    } catch (apiError: any) {
      console.error('HuggingFace API failed, using fallback:', apiError.message)
      hfResponse = { error: 'API unavailable' }
    }
    
    let aiResponse: any = { tasks: [] }
    
    // Check for API errors or model loading
    if (hfResponse.error) {
      console.warn('Model is loading, using fallback extraction')
      // Fallback: simple extraction
      const lines = content.split('\n').filter((line: string) => line.trim())
      const fallbackTasks = lines.slice(0, 5).map((line: string) => ({
        title: line.replace(/^[-•*]\s*/, '').substring(0, 100),
        description: '',
        priority: 'MEDIUM',
        assignee: null
      }))
      
      if (fallbackTasks.length === 0) {
        return res.status(400).json({ error: 'No tasks found in content' })
      }
      
      aiResponse = { tasks: fallbackTasks }
    } else {
      const generatedText = hfResponse[0]?.generated_text || ''
      
      // Extract JSON from response
      const jsonMatch = generatedText.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        console.warn('No JSON found in AI response, using fallback')
        const lines = content.split('\n').filter((line: string) => line.trim())
        const fallbackTasks = lines.slice(0, 5).map((line: string) => ({
          title: line.replace(/^[-•*]\s*/, '').substring(0, 100),
          description: '',
          priority: 'MEDIUM',
          assignee: null
        }))
        aiResponse = { tasks: fallbackTasks }
      } else {
        try {
          aiResponse = JSON.parse(jsonMatch[0])
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          const lines = content.split('\n').filter((line: string) => line.trim())
          const fallbackTasks = lines.slice(0, 5).map((line: string) => ({
            title: line.replace(/^[-•*]\s*/, '').substring(0, 100),
            description: '',
            priority: 'MEDIUM',
            assignee: null
          }))
          aiResponse = { tasks: fallbackTasks }
        }
      }
    }

    const extractedTasks = aiResponse.tasks || []
    
    console.log('Extracted tasks count:', extractedTasks.length)
    
    if (extractedTasks.length === 0) {
      console.error('No tasks extracted')
      return res.status(400).json({ error: 'No tasks could be extracted from the content' })
    }

    // Get board members for assignee matching
    console.log('Fetching board members...')
    const boardMembers = await prisma.boardMember.findMany({
      where: { boardId: targetBoardId },
      include: {
        user: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Create tasks
    const createdTasks = []
    for (const taskData of extractedTasks) {
      try {
        // Validate task data
        if (!taskData.title || typeof taskData.title !== 'string') {
          console.warn('Skipping task with invalid title:', taskData)
          continue
        }

        // Try to match assignee
        let assigneeId = null
        if (taskData.assignee && typeof taskData.assignee === 'string') {
          const member = boardMembers.find(m => 
            m.user.name.toLowerCase().includes(taskData.assignee.toLowerCase())
          )
          assigneeId = member?.user.id || null
        }

        // Get next position
        const lastTask = await prisma.task.findFirst({
          where: { boardId: targetBoardId, status: 'BACKLOG' },
          orderBy: { position: 'desc' }
        })

        const position = lastTask ? lastTask.position + 1 : 0

        // Validate priority
        const validPriorities = ['URGENT', 'HIGH', 'MEDIUM', 'LOW']
        const priority = validPriorities.includes(taskData.priority) ? taskData.priority : 'MEDIUM'

        const task = await prisma.task.create({
          data: {
            title: taskData.title.substring(0, 255), // Limit title length
            description: (taskData.description || '').substring(0, 5000), // Limit description
            boardId: targetBoardId,
            creatorId: session.user.id,
            assigneeId,
            status: 'BACKLOG',
            priority,
            position,
            aiSummary: 'Extracted from meeting notes'
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

        createdTasks.push(task)

        // Create activity log
        await prisma.activity.create({
          data: {
            taskId: task.id,
            userId: session.user.id,
            action: 'created',
            details: { 
              title: task.title,
              source: 'Meeting Notes Extraction'
            }
          }
        })
      } catch (taskError: any) {
        console.error('Error creating individual task:', taskError)
        // Continue with next task instead of failing completely
        continue
      }
    }
    
    if (createdTasks.length === 0) {
      return res.status(400).json({ error: 'Failed to create any tasks. Please check your meeting notes format.' })
    }

    // Create meeting if meeting details provided
    let meeting = null
    if (meetingTitle) {
      console.log('Creating meeting record...')
      try {
        meeting = await prisma.meeting.create({
          data: {
            title: meetingTitle,
            notes: content,
            meetingDate: meetingDate ? new Date(meetingDate) : new Date(),
            duration: meetingDuration ? parseInt(meetingDuration) : null,
            location: meetingLocation || null,
            attendees: meetingAttendees || [],
            tags: [],
            creatorId: session.user.id,
            boardId: targetBoardId
          },
          include: {
            board: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        })

        // Link tasks to meeting
        await prisma.task.updateMany({
          where: {
            id: { in: createdTasks.map(t => t.id) }
          },
          data: {
            meetingId: meeting.id
          }
        })

        console.log('Meeting created and tasks linked')
      } catch (meetingError: any) {
        console.error('Error creating meeting:', meetingError)
        // Continue even if meeting creation fails
      }
    }

    return res.status(200).json({
      tasks: createdTasks,
      count: createdTasks.length,
      boardId: targetBoardId,
      meeting: meeting
    })
  } catch (error: any) {
    console.error('Error extracting tasks:', error)
    return res.status(500).json({ 
      error: 'Failed to extract tasks',
      details: error.message 
    })
  }
}
