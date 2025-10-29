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
    await ensureBoardAccess(task.boardId, session.user.id)
  } catch (error) {
    if (error instanceof AccessDeniedError) {
      return res.status(403).json({ error: 'Access denied' })
    }
    throw error
  }

  if (req.method === 'POST') {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tasks', id)
      
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
            if (err) reject(err)
            else resolve([fields, files])
          })
        }
      )

      const file = Array.isArray(files.file) ? files.file[0] : files.file

      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const filename = path.basename(file.filepath)
      const relativeFilePath = path.relative(path.join(process.cwd(), 'public'), file.filepath).split(path.sep).join('/')
      const url = `/${relativeFilePath}`

      const attachment = await prisma.attachment.create({
        data: {
          filename,
          originalName: file.originalFilename || filename,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          url,
          taskId: id,
          uploadedBy: session.user.id
        }
      })

      // Create activity
      await prisma.activity.create({
        data: {
          taskId: id,
          userId: session.user.id,
          action: 'attached_file',
          details: { filename: attachment.originalName }
        }
      })

      return res.status(201).json(attachment)
    } catch (error) {
      console.error('Error uploading attachment:', error)
      return res.status(500).json({ error: 'Failed to upload attachment' })
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
