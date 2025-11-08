import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../../../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
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

  // DELETE - Delete file
  if (req.method === 'DELETE') {
    try {
      const file = await prisma.attachment.findUnique({
        where: { id: fileId },
      })

      if (!file || file.contactId !== contactId || file.deletedAt) {
        return res.status(404).json({ error: 'File not found' })
      }

      // Only allow owner or admin to delete
      if (file.uploadedBy !== session.user.id && session.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      // Delete from Supabase Storage
      try {
        await deleteFile(file.filename)
      } catch (err) {
        console.error('Error deleting file from storage:', err)
      }

      // Soft delete in database
      await prisma.attachment.update({
        where: { id: fileId },
        data: { deletedAt: new Date() },
      })

      return res.status(200).json({ message: 'File deleted' })
    } catch (error) {
      console.error('Error deleting file:', error)
      return res.status(500).json({ error: 'Failed to delete file' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
