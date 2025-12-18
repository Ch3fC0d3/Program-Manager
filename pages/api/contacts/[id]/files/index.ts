import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import formidable from 'formidable'
import { uploadFileFromPath, getSignedUrl, ensureBucket, listFiles, deleteFile } from '@/lib/supabaseStorage'

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

  const folder = `contacts/${contactId}`

  // GET - List contact files
  if (req.method === 'GET') {
    try {
      await ensureBucket()
      const files = await listFiles(folder)
      return res.status(200).json(files)
    } catch (error) {
      console.error('Error fetching contact files:', error)
      return res.status(500).json({ error: 'Failed to fetch files' })
    }
  }

  // DELETE - Delete a file by storage path (passed via query param)
  if (req.method === 'DELETE') {
    try {
      const pathParam = Array.isArray(req.query.path) ? req.query.path[0] : req.query.path
      if (!pathParam || typeof pathParam !== 'string') {
        return res.status(400).json({ error: 'Missing file path' })
      }

      // Prevent deleting outside the contact folder
      if (!pathParam.startsWith(`${folder}/`)) {
        return res.status(400).json({ error: 'Invalid file path' })
      }

      await ensureBucket()
      await deleteFile(pathParam)

      return res.status(200).json({ message: 'File deleted' })
    } catch (error) {
      console.error('Error deleting contact file:', error)
      return res.status(500).json({ error: 'Failed to delete file' })
    }
  }

  // POST - Upload new file
  if (req.method === 'POST') {
    try {
      // Ensure bucket exists
      await ensureBucket()

      const form = formidable({
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

      // Upload to Supabase Storage
      const originalName = file.originalFilename || 'file'
      const storagePath = `${folder}/${Date.now()}-${originalName}`
      
      const uploadResult = await uploadFileFromPath(
        storagePath,
        file.filepath,
        file.mimetype || 'application/octet-stream'
      )

      if (!uploadResult.success) {
        console.error('Supabase upload failed:', uploadResult.error)
        return res.status(500).json({ error: uploadResult.error || 'Failed to upload file' })
      }

      // Get signed URL for download
      const signedUrlResult = await getSignedUrl(storagePath)
      const url = signedUrlResult.success ? signedUrlResult.url || '' : ''

      return res.status(201).json({
        success: true,
        id: storagePath,
        name: originalName,
        size: file.size?.toString?.() ?? String(file.size ?? '0'),
        mimeType: file.mimetype || 'application/octet-stream',
        modifiedTime: new Date().toISOString(),
        webViewLink: url,
      })
    } catch (error: any) {
      console.error('Error uploading file:', error)
      return res.status(500).json({ 
        error: 'Failed to upload file',
        details: error.message || String(error)
      })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
