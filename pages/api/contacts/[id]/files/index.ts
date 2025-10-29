import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
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

  const contactId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  if (!contactId) {
    return res.status(400).json({ error: 'Contact ID is required' })
  }

  // Verify contact exists
  const contact = await prisma.contact.findUnique({
    where: { id: contactId },
  })

  if (!contact || contact.deletedAt) {
    return res.status(404).json({ error: 'Contact not found' })
  }

  // GET - List contact files
  if (req.method === 'GET') {
    try {
      const files = await prisma.attachment.findMany({
        where: {
          contactId,
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      })

      return res.status(200).json(files)
    } catch (error) {
      console.error('Error fetching contact files:', error)
      return res.status(500).json({ error: 'Failed to fetch files' })
    }
  }

  // POST - Upload new file
  if (req.method === 'POST') {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'contacts')
      
      // Ensure upload directory exists
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const form = formidable({
        uploadDir,
        keepExtensions: true,
        maxFileSize: 50 * 1024 * 1024, // 50MB
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
      const url = `/uploads/contacts/${filename}`

      const attachment = await prisma.attachment.create({
        data: {
          filename,
          originalName: file.originalFilename || filename,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          url,
          contactId,
          uploadedBy: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      })

      return res.status(201).json(attachment)
    } catch (error) {
      console.error('Error uploading file:', error)
      return res.status(500).json({ error: 'Failed to upload file' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
