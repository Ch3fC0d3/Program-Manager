import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { deleteFile } from '@/lib/supabaseStorage'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const contactId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  const fileId = Array.isArray(req.query.fileId) ? req.query.fileId[0] : req.query.fileId

  if (!contactId || !fileId) {
    return res.status(400).json({ error: 'Contact ID and File ID are required' })
  }

  const folder = `contacts/${contactId}`

  // DELETE - Delete file
  if (req.method === 'DELETE') {
    try {
      // fileId is expected to be the full storage path (as returned by listFiles)
      if (typeof fileId !== 'string' || !fileId.startsWith(`${folder}/`)) {
        return res.status(400).json({ error: 'Invalid file path' })
      }

      await deleteFile(fileId)
      return res.status(200).json({ message: 'File deleted' })
    } catch (error) {
      console.error('Error deleting file:', error)
      return res.status(500).json({ error: 'Failed to delete file' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
