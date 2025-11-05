import type { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { deleteFile } from '@/lib/googleDrive'

function isAdminOrManager(role?: string | null) {
  return role === 'ADMIN' || role === 'MANAGER'
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)
  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const { id } = req.query
  if (typeof id !== 'string') {
    return res.status(400).json({ error: 'Invalid file id' })
  }

  if (req.method === 'DELETE') {
    if (!isAdminOrManager(session.user.role as string | undefined)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    try {
      await deleteFile(id)
      return res.status(204).end()
    } catch (err) {
      console.error('Delete file error:', err)
      return res.status(500).json({ error: 'Failed to delete file' })
    }
  }

  res.setHeader('Allow', 'DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
