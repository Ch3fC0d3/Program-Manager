// Force rebuild: 2025-10-30-11:24
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
      // Check if dashboardFile model exists
      if (!(prisma as any).dashboardFile) {
        console.error('DashboardFile model not found in Prisma client')
        console.error('Available models:', Object.keys(prisma))
        return res.status(200).json([]) // Return empty array for now
      }

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

      const files = await (prisma as any).dashboardFile.findMany({
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
    } catch (error: any) {
      // If Prisma fails, return empty array with debug info
      console.error('=== PRISMA QUERY FAILED ===')
      console.error('Prisma Error:', error)
      console.error('Available models:', Object.keys(prisma))
      return res.status(200).json({
        error: 'Database temporarily unavailable',
        files: [],
        debug: {
          hasDashboardFile: !!(prisma as any).dashboardFile,
          prismaKeys: Object.keys(prisma).filter(k => k.includes('file') || k.includes('dashboard')),
          error: error.message
        }
      })
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

      const nameField = Array.isArray(fields.name) ? fields.name[0] : fields.name
      const name = (typeof nameField === 'string' ? nameField : file.originalFilename) || 'Untitled'
      
      const descField = Array.isArray(fields.description) ? fields.description[0] : fields.description
      const description = typeof descField === 'string' ? descField : undefined
      
      const catField = Array.isArray(fields.category) ? fields.category[0] : fields.category
      const category = typeof catField === 'string' ? catField : undefined
      
      const impField = Array.isArray(fields.isImportant) ? fields.isImportant[0] : fields.isImportant
      const isImportant = impField === 'true'
      
      const pinField = Array.isArray(fields.isPinned) ? fields.isPinned[0] : fields.isPinned
      const isPinned = pinField === 'true'

      const filename = path.basename(file.filepath)
      const url = `/uploads/dashboard/${filename}`

      const dashboardFile = await (prisma as any).dashboardFile.create({
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
    } catch (error: any) {
      console.error('=== FILE UPLOAD ERROR ===')
      console.error('Error:', error)
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
      console.error('Has dashboardFile model:', !!(prisma as any).dashboardFile)
      console.error('========================')
      return res.status(500).json({ 
        error: 'Failed to upload file',
        details: error.message,
        debug: {
          hasDashboardFile: !!(prisma as any).dashboardFile,
          errorType: error.constructor.name
        }
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
