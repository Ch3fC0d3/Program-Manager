import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import formidable from 'formidable'
import fs from 'fs'
import path from 'path'

export const config = {
  api: {
    bodyParser: false,
  },
}

interface UploadedFileMeta {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  storedAt: string
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const uploadDir = path.join(process.cwd(), 'public', 'uploads')

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true })
    }

    const form = formidable({
      uploadDir,
      keepExtensions: true,
      maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
      multiples: false,
    })

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    const originalName = file.originalFilename || file.newFilename
    const sanitizedOriginal = originalName?.replace(/[^a-zA-Z0-9_.-]/g, '_') || 'upload'
    const ext = path.extname(sanitizedOriginal)
    const baseName = path.basename(sanitizedOriginal, ext)
    const finalFilename = `${baseName}_${Date.now()}${ext || ''}`
    const finalFilePath = path.join(uploadDir, finalFilename)

    fs.renameSync(file.filepath, finalFilePath)

    const metadata: UploadedFileMeta = {
      id: finalFilename,
      filename: finalFilename,
      originalName: originalName || finalFilename,
      mimeType: file.mimetype || 'application/octet-stream',
      size: file.size,
      url: `/uploads/${finalFilename}`,
      storedAt: new Date().toISOString(),
    }

    return res.status(201).json(metadata)
  } catch (error) {
    console.error('Error uploading AI source file:', error)
    return res.status(500).json({ error: 'Failed to upload file' })
  }
}
