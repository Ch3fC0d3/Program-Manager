import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { listFiles, uploadFile, ensureBucket } from '@/lib/supabaseStorage'
import formidable from 'formidable'
import fs from 'fs'

export const config = {
  api: {
    bodyParser: false,
  },
}

function isAdminOrManager(role?: string | null) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    // Ensure bucket exists
    await ensureBucket()

    if (req.method === 'GET') {
      const files = await listFiles()
      return res.status(200).json(files)
    }

    if (req.method === 'POST') {
      if (!isAdminOrManager(session.user.role as string | undefined)) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const form = formidable({ multiples: false })
      const { fields, files } = await new Promise<{ fields: formidable.Fields; files: formidable.Files }>((resolve, reject) => {
        form.parse(req, (err, fields, files) => {
          if (err) return reject(err)
          resolve({ fields, files })
        })
      })

      const file = files.file || files['file']
      if (!file) {
        return res.status(400).json({ error: 'No file uploaded' })
      }

      const f = Array.isArray(file) ? file[0] : file
      const filePath = f.filepath || (f as any).path
      const buffer = await fs.promises.readFile(filePath)
      const mimeType = f.mimetype || 'application/octet-stream'
      const originalName = f.originalFilename || 'upload'

      const created = await uploadFile(originalName, buffer, mimeType)

      return res.status(201).json(created)
    }

    res.setHeader('Allow', 'GET,POST')
    return res.status(405).json({ error: 'Method not allowed' })
  } catch (err: any) {
    console.error('Files API error:', err)
    const message = typeof err?.message === 'string' ? err.message : 'Internal Server Error'
    return res.status(500).json({ error: message })
  }
}
