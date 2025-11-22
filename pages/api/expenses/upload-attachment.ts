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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user || session.user.role !== 'ADMIN') {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB
      keepExtensions: true,
    })

    const [fields, files] = await form.parse(req)
    const expenseId = Array.isArray(fields.expenseId) ? fields.expenseId[0] : fields.expenseId
    const file = Array.isArray(files.file) ? files.file[0] : files.file

    if (!expenseId || !file) {
      return res.status(400).json({ error: 'Missing expense ID or file' })
    }

    // Verify expense exists
    const expense = await prisma.expense.findUnique({
      where: { id: expenseId },
      select: { id: true }
    })

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' })
    }

    // Read file data
    const fileData = fs.readFileSync(file.filepath)
    const base64Data = fileData.toString('base64')
    const dataUrl = `data:${file.mimetype};base64,${base64Data}`

    // Get current user
    const currentUser = await prisma.user.findUnique({
      where: { email: session.user.email! },
      select: { id: true }
    })

    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Create attachment
    const attachment = await prisma.attachment.create({
      data: {
        filename: file.originalFilename || 'uploaded-file',
        originalName: file.originalFilename || 'uploaded-file',
        url: dataUrl,
        mimeType: file.mimetype || 'application/octet-stream',
        size: file.size,
        uploadedBy: currentUser.id,
        expenseId: expenseId,
        taskId: '',
        contactId: null,
      }
    })

    // Clean up temp file
    fs.unlinkSync(file.filepath)

    return res.status(201).json(attachment)
  } catch (error) {
    console.error('File upload error:', error)
    return res.status(500).json({ 
      error: 'Failed to upload file',
      details: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}
