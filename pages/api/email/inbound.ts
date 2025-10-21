import { NextApiRequest, NextApiResponse } from 'next'
import { prisma } from '@/lib/prisma'

/**
 * Maileroo Inbound Email Webhook
 * 
 * This endpoint receives emails forwarded by Maileroo and creates tasks automatically.
 * 
 * Maileroo sends POST requests with the following structure:
 * {
 *   "from": "sender@example.com",
 *   "to": "tasks@yourdomain.com",
 *   "subject": "Task subject line",
 *   "text": "Plain text body",
 *   "html": "HTML body",
 *   "headers": {...},
 *   "attachments": [...]
 * }
 */

interface MailerooInboundPayload {
  from: string
  to: string | string[]
  subject: string
  text?: string
  html?: string
  headers?: Record<string, string>
  attachments?: Array<{
    filename: string
    contentType: string
    size: number
    content?: string // Base64 encoded
  }>
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only accept POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const payload: MailerooInboundPayload = req.body

    console.log('📧 Received inbound email:', {
      from: payload.from,
      to: payload.to,
      subject: payload.subject,
      hasText: !!payload.text,
      hasHtml: !!payload.html,
      attachmentCount: payload.attachments?.length || 0
    })

    // Validate required fields
    if (!payload.from || !payload.subject) {
      console.error('❌ Missing required fields (from or subject)')
      return res.status(400).json({ error: 'Missing required fields: from, subject' })
    }

    // Extract sender email
    const senderEmail = extractEmail(payload.from)
    if (!senderEmail) {
      console.error('❌ Invalid sender email:', payload.from)
      return res.status(400).json({ error: 'Invalid sender email' })
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email: senderEmail }
    })

    if (!user) {
      console.error('❌ User not found for email:', senderEmail)
      return res.status(404).json({ 
        error: 'User not found. Only registered users can create tasks via email.',
        email: senderEmail
      })
    }

    // Get user's default board (first board they're a member of)
    const boardMember = await prisma.boardMember.findFirst({
      where: { userId: user.id },
      include: { board: true }
    })

    if (!boardMember) {
      console.error('❌ User has no boards:', user.email)
      return res.status(400).json({ 
        error: 'User must be a member of at least one board to create tasks via email.'
      })
    }

    // Parse email content
    const taskTitle = payload.subject.trim()
    const taskDescription = payload.text || stripHtml(payload.html || '')

    // Extract priority from subject line (e.g., "[URGENT]" or "[HIGH]")
    const priority = extractPriority(payload.subject)

    // Extract labels/tags from subject (e.g., "#bug" or "#feature")
    const tags = extractTags(payload.subject)

    // Create the task
    const task = await prisma.task.create({
      data: {
        title: taskTitle,
        description: taskDescription.trim(),
        priority: priority,
        status: 'BACKLOG', // Default status
        cardType: 'TASK',
        boardId: boardMember.boardId,
        creatorId: user.id,
        assigneeId: user.id, // Assign to sender by default
      }
    })

    // Fetch task with relations
    const taskWithRelations = await prisma.task.findUnique({
      where: { id: task.id },
      include: {
        creator: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        assignee: {
          select: { id: true, name: true, email: true, avatar: true }
        },
        board: {
          select: { id: true, name: true, color: true }
        }
      }
    })

    // Log activity
    await prisma.activity.create({
      data: {
        taskId: task.id,
        userId: user.id,
        action: 'created_via_email',
        details: {
          source: 'email',
          from: payload.from,
          subject: payload.subject
        }
      }
    })

    // Handle attachments (if any)
    if (payload.attachments && payload.attachments.length > 0) {
      console.log(`📎 Processing ${payload.attachments.length} attachments...`)
      // Note: Attachment handling would require file storage setup
      // For now, we'll just log them
      for (const attachment of payload.attachments) {
        console.log(`  - ${attachment.filename} (${attachment.contentType}, ${attachment.size} bytes)`)
      }
    }

    console.log('✅ Task created successfully:', {
      taskId: task.id,
      title: task.title,
      boardId: task.boardId,
      creatorId: task.creatorId
    })

    // Return success response
    return res.status(201).json({
      success: true,
      message: 'Task created successfully from email',
      task: {
        id: taskWithRelations?.id || task.id,
        title: taskWithRelations?.title || task.title,
        description: taskWithRelations?.description || task.description,
        priority: taskWithRelations?.priority || task.priority,
        status: taskWithRelations?.status || task.status,
        board: taskWithRelations?.board,
        creator: taskWithRelations?.creator,
        assignee: taskWithRelations?.assignee,
        url: `${process.env.NEXTAUTH_URL}/tasks/${task.id}`
      }
    })

  } catch (error) {
    console.error('❌ Error processing inbound email:', error)
    return res.status(500).json({ 
      error: 'Failed to process email',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}

/**
 * Extract email address from "Name <email@example.com>" format
 */
function extractEmail(fromField: string): string | null {
  const emailRegex = /<([^>]+)>|^([^\s]+@[^\s]+)$/
  const match = fromField.match(emailRegex)
  return match ? (match[1] || match[2]) : null
}

/**
 * Extract priority from subject line
 * Looks for: [URGENT], [HIGH], [MEDIUM], [LOW]
 */
function extractPriority(subject: string): 'URGENT' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const upperSubject = subject.toUpperCase()
  
  if (upperSubject.includes('[URGENT]') || upperSubject.includes('URGENT:')) {
    return 'URGENT'
  }
  if (upperSubject.includes('[HIGH]') || upperSubject.includes('HIGH:')) {
    return 'HIGH'
  }
  if (upperSubject.includes('[LOW]') || upperSubject.includes('LOW:')) {
    return 'LOW'
  }
  
  return 'MEDIUM'
}

/**
 * Extract hashtags from subject line
 * Example: "Fix bug #urgent #backend" -> ["urgent", "backend"]
 */
function extractTags(subject: string): string[] {
  const tagRegex = /#(\w+)/g
  const matches = subject.matchAll(tagRegex)
  return Array.from(matches, m => m[1])
}

/**
 * Strip HTML tags from HTML content
 */
function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>.*?<\/style>/gi, '')
    .replace(/<script[^>]*>.*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim()
}

// Disable body parsing to handle raw webhook payload
export const config = {
  api: {
    bodyParser: true, // Maileroo sends JSON
  },
}
