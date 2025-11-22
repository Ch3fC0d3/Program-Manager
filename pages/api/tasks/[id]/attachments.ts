import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { ensureBoardAccess, AccessDeniedError } from '@/lib/authz'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Resolve user ID from session
  const userId = session.user.id || (session.user.email ? (await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true }
  }))?.id : null)

  if (!userId) {
    return res.status(401).json({ error: 'User not found' })
  }

  const { id } = req.query

  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid task ID' })
  }

  const task = await prisma.task.findUnique({
    where: { id },
    select: { boardId: true }
  })

  if (!task) {
    return res.status(404).json({ error: 'Task not found' })
  }

  try {
    await ensureBoardAccess(task.boardId, userId)
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return res.status(403).json({ error: 'Access denied' })
    }
    throw error
  }

  if (req.method === 'POST') {
    try {
      // Use /tmp for serverless environments (Vercel)
      const uploadDir = process.env.VERCEL 
        ? path.join('/tmp', 'uploads', 'tasks', id)
        : path.join(process.cwd(), 'public', 'uploads', 'tasks', id)
      
      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const form = formidable({
        uploadDir,
        keepExtensions: true,
        maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
      })

      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
        (resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) {
              console.error('Formidable parse error:', err)
              reject(err)
            } else {
              resolve([fields, files])
            }
          })
        }
      )

      const file = Array.isArray(files.file) ? files.file[0] : files.file

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      // Read file content and convert to base64 for storage
      const fileContent = fs.readFileSync(file.filepath)
      const base64Content = fileContent.toString('base64')
      const dataUrl = `data:${file.mimetype || 'application/octet-stream'};base64,${base64Content}`

      const attachment = await prisma.attachment.create({
        data: {
          filename: file.originalFilename || path.basename(file.filepath),
          originalName: file.originalFilename || path.basename(file.filepath),
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          url: dataUrl, // Store as data URL for serverless compatibility
          taskId: id,
          uploadedBy: userId,
          expenseId: null,
          contactId: null,
        }
      })

      // Clean up temp file
      try {
        fs.unlinkSync(file.filepath)
      } catch (cleanupError) {
        console.warn('Failed to cleanup temp file:', cleanupError)
      }

      // Create activity
      await prisma.activity.create({
        data: {
          taskId: id,
          userId: userId,
          action: 'attached_file',
          details: { filename: attachment.originalName }
        }
      })

      return res.status(201).json(attachment)
    } catch (error: any) {
      console.error('Error uploading attachment:', error)
      return res.status(500).json({ 
        error: 'Failed to upload attachment',
        details: error.message 
      })
    }
  }

  if (req.method === 'DELETE') {
    try {
      const { attachmentId } = req.query

      if (typeof attachmentId !== 'string') {
        return res.status(400).json({ error: 'Invalid attachment ID' })
      }

      const attachment = await prisma.attachment.findUnique({
        where: { id: attachmentId },
        select: {
          id: true,
          taskId: true,
          url: true
        }
      })

      if (!attachment || attachment.taskId !== id) {
        return res.status(404).json({ error: 'Attachment not found' })
      }

      // Delete file from filesystem
      const relativePath = attachment.url.startsWith('/') ? attachment.url.slice(1) : attachment.url
      const filepath = path.join(process.cwd(), 'public', relativePath)
      if (fs.existsSync(filepath)) {
        fs.unlinkSync(filepath)
      }

      await prisma.attachment.delete({
        where: { id: attachmentId }
      })

      return res.status(204).end()
    } catch (error) {
      console.error('Error deleting attachment:', error)
      return res.status(500).json({ error: 'Failed to delete attachment' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
