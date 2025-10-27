import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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

    const prompt = `You are an expert at extracting actionable tasks from documents including meeting notes, estimates, invoices, and project documents.

Analyze the following content and extract tasks. For estimates/quotes, create tasks for the work items. For meeting notes, extract action items.

Content:
${content}

For each task, extract:
1. **Title**: A clear, actionable title (e.g., "Complete water well drilling at Site A" or "Review estimate #14292")
2. **Description**: Relevant details including amounts, dates, locations, vendor info
3. **Priority**: URGENT, HIGH, MEDIUM, or LOW based on context
4. **Assignee**: Person's name if mentioned, otherwise null

IMPORTANT:
- For estimates/quotes: Use project name, estimate number, or vendor name in the title
- Include key details like amounts, dates, locations in description
- Extract contact information and reference numbers
- If it's an estimate, the title should describe the work (not just "Untitled Task")

Respond with ONLY valid JSON (no markdown, no code blocks):
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

    console.log('Calling OpenAI API...')
    
    let aiApiResponse: any = null
    try {
      if (!OPENAI_API_KEY) {
        throw new Error('OpenAI API key not configured')
      }

      const response = await fetch(
        'https://api.openai.com/v1/chat/completions',
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert at extracting structured task information from documents. Always return valid JSON only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.2,
            max_tokens: 1000
          })
        }
      )

      if (!response.ok) {
        const errorData = await response.json()
        console.warn(`OpenAI API error:`, errorData)
        throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
      }

      aiApiResponse = await response.json()
      console.log('OpenAI response received')
    } catch (apiError: any) {
      console.error('OpenAI API failed, using fallback:', apiError.message)
      aiApiResponse = { error: 'API unavailable' }
    }
    
    let aiResponse: any = { tasks: [] }
    
    // Check for API errors
    if (aiApiResponse.error) {
      console.warn('AI API unavailable, using intelligent fallback extraction')
      // Improved fallback: extract key information
      const lines = content.split('\n').filter((line: string) => line.trim())
      
      // Try to find estimate number, project name, or vendor
      const estimateMatch = content.match(/estimate\s*#?\s*(\d+)/i)
      const projectMatch = content.match(/project\s*name[:\s]+([^\n]+)/i)
      const vendorMatch = content.match(/(?:vendor|company)[:\s]+([^\n]+)/i)
      
      const title = projectMatch?.[1]?.trim() || 
                    (estimateMatch ? `Review Estimate #${estimateMatch[1]}` : null) ||
                    vendorMatch?.[1]?.trim() ||
                    lines[0]?.substring(0, 100) || 
                    'Review Document'
      
      const fallbackTasks = [{
        title,
        description: content.substring(0, 500),
        priority: 'MEDIUM',
        assignee: null
      }]
      
      aiResponse = { tasks: fallbackTasks }
    } else {
      const messageContent = aiApiResponse.choices?.[0]?.message?.content || ''
      
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = messageContent.match(/\{[\s\S]*\}/) || messageContent.match(/```json\s*([\s\S]*?)```/)
      if (!jsonMatch) {
        console.warn('No JSON found in AI response, using fallback')
        const lines = content.split('\n').filter((line: string) => line.trim())
        const estimateMatch = content.match(/estimate\s*#?\s*(\d+)/i)
        const projectMatch = content.match(/project\s*name[:\s]+([^\n]+)/i)
        
        const title = projectMatch?.[1]?.trim() || 
                      (estimateMatch ? `Review Estimate #${estimateMatch[1]}` : null) ||
                      lines[0]?.substring(0, 100) || 
                      'Review Document'
        
        aiResponse = { tasks: [{
          title,
          description: content.substring(0, 500),
          priority: 'MEDIUM',
          assignee: null
        }] }
      } else {
        try {
          const jsonStr = jsonMatch[1] || jsonMatch[0]
          aiResponse = JSON.parse(jsonStr)
        } catch (parseError) {
          console.error('JSON parse error:', parseError)
          const lines = content.split('\n').filter((line: string) => line.trim())
          aiResponse = { tasks: [{
            title: lines[0]?.substring(0, 100) || 'Review Document',
            description: content.substring(0, 500),
            priority: 'MEDIUM',
            assignee: null
          }] }
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
