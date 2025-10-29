import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import fs from 'fs'
import path from 'path'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const fileId = Array.isArray(req.query.id) ? req.query.id[0] : req.query.id
  if (!fileId) {
    return res.status(400).json({ error: 'File ID is required' })
  }

  // GET - Get single file
  if (req.method === 'GET') {
    try {
      const file = await (prisma as any).dashboardFile.findUnique({
        where: { id: fileId },
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

      if (!file || file.deletedAt) {
        return res.status(404).json({ error: 'File not found' })
      }

      return res.status(200).json(file)
    } catch (error) {
      console.error('Error fetching file:', error)
      return res.status(500).json({ error: 'Failed to fetch file' })
    }
  }

  // PATCH - Update file metadata
  if (req.method === 'PATCH') {
    try {
      const { name, description, category, isImportant, isPinned } = req.body

      const existing = await (prisma as any).dashboardFile.findUnique({
        where: { id: fileId },
      })

      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: 'File not found' })
      }

      // Only allow owner or admin to update
      if (existing.uploadedBy !== session.user.id && session.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const updated = await (prisma as any).dashboardFile.update({
        where: { id: fileId },
        data: {
          ...(name !== undefined && { name }),
          ...(description !== undefined && { description }),
          ...(category !== undefined && { category }),
          ...(isImportant !== undefined && { isImportant }),
          ...(isPinned !== undefined && { isPinned }),
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

      return res.status(200).json(updated)
    } catch (error) {
      console.error('Error updating file:', error)
      return res.status(500).json({ error: 'Failed to update file' })
    }
  }

  // DELETE - Soft delete file
  if (req.method === 'DELETE') {
    try {
      const existing = await (prisma as any).dashboardFile.findUnique({
        where: { id: fileId },
      })

      if (!existing || existing.deletedAt) {
        return res.status(404).json({ error: 'File not found' })
      }

      // Only allow owner or admin to delete
      if (existing.uploadedBy !== session.user.id && session.user.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Forbidden' })
      }

      // Soft delete
      await (prisma as any).dashboardFile.update({
        where: { id: fileId },
        data: { deletedAt: new Date() },
      })

      // Optionally delete physical file
      try {
        const filePath = path.join(process.cwd(), 'public', existing.url)
        if (fs.existsSync(filePath)) {
          fs.unlinkSync(filePath)
        }
      } catch (err) {
        console.error('Error deleting physical file:', err)
      }

      return res.status(200).json({ message: 'File deleted' })
    } catch (error) {
      console.error('Error deleting file:', error)
      return res.status(500).json({ error: 'Failed to delete file' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
