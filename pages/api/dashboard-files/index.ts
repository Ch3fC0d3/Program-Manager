import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
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

  // GET - List dashboard files
  if (req.method === 'GET') {
    try {
      const { category, pinned } = req.query

      const where: any = {
        deletedAt: null,
      }

      if (category && category !== 'all') {
        where.category = category
      }

      if (pinned === 'true') {
        where.isPinned = true
      }

      const files = await prisma.dashboardFile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: [
          { isPinned: 'desc' },
          { createdAt: 'desc' },
        ],
      })

      return res.status(200).json(files)
    } catch (error) {
      console.error('Error fetching dashboard files:', error)
      return res.status(500).json({ error: 'Failed to fetch files' })
    }
  }

  // POST - Upload new file
  if (req.method === 'POST') {
    try {
      const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'dashboard')
      
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

      const name = Array.isArray(fields.name) ? fields.name[0] : fields.name || file.originalFilename || 'Untitled'
      const description = Array.isArray(fields.description) ? fields.description[0] : fields.description
      const category = Array.isArray(fields.category) ? fields.category[0] : fields.category
      const isImportant = fields.isImportant === 'true' || fields.isImportant === true
      const isPinned = fields.isPinned === 'true' || fields.isPinned === true

      const filename = path.basename(file.filepath)
      const url = `/uploads/dashboard/${filename}`

      const dashboardFile = await prisma.dashboardFile.create({
        data: {
          name,
          description: description || null,
          filename,
          originalName: file.originalFilename || filename,
          mimeType: file.mimetype || 'application/octet-stream',
          size: file.size,
          url,
          category: category || null,
          isImportant,
          isPinned,
          uploadedBy: session.user.id,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      })

      return res.status(201).json(dashboardFile)
    } catch (error) {
      console.error('Error uploading file:', error)
      return res.status(500).json({ error: 'Failed to upload file' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
