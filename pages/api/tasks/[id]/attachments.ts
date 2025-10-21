import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
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

  if (req.method === 'POST') {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads')
      
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
      const url = `/uploads/${filename}`

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
        where: { id: attachmentId }
      })

      if (!attachment) {
        return res.status(404).json({ error: 'Attachment not found' })
      }

      // Delete file from filesystem
      const filepath = path.join(process.cwd(), 'public', attachment.url)
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
