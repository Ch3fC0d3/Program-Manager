import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import formidable from 'formidable'
import fs from 'fs'
import Papa from 'papaparse'

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

  if (req.method === 'POST') {
    try {
      const form = formidable()

      const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
        (resolve, reject) => {
          form.parse(req, (err, fields, files) => {
            if (err) reject(err)
            else resolve([fields, files])
          })
        }
      )

      const file = Array.isArray(files.file) ? files.file[0] : files.file
      const boardId = Array.isArray(fields.boardId) ? fields.boardId[0] : fields.boardId

      if (!file || !boardId) {
        return res.status(400).json({ error: 'File and board ID are required' })
      }

      // Verify access
      const member = await prisma.boardMember.findFirst({
        where: {
          boardId,
          userId: session.user.id
        }
      })

      if (!member) {
        return res.status(403).json({ error: 'Access denied' })
      }

      // Read CSV file
      const csvContent = fs.readFileSync(file.filepath, 'utf-8')
      const parsed = Papa.parse(csvContent, {
        header: true,
        skipEmptyLines: true
      })

      const imported: any[] = []
      const errors: any[] = []

      // Get all users for assignee matching
      const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true }
      })

      for (const row of parsed.data as any[]) {
        try {
          if (!row.Title) {
            errors.push({ row, error: 'Title is required' })
            continue
          }

          // Find assignee
          let assigneeId = null
          if (row.Assignee) {
            const assignee = users.find(
              u => u.name === row.Assignee || u.email === row.Assignee
            )
            assigneeId = assignee?.id || null
          }

          const task = await prisma.task.create({
            data: {
              title: row.Title,
              description: row.Description || null,
              status: row.Status || 'BACKLOG',
              priority: row.Priority || 'MEDIUM',
              boardId,
              creatorId: session.user.id,
              assigneeId,
              dueDate: row['Due Date'] ? new Date(row['Due Date']) : null,
              startDate: row['Start Date'] ? new Date(row['Start Date']) : null,
            }
          })

          imported.push(task)
        } catch (error: any) {
          errors.push({ row, error: error.message })
        }
      }

      // Clean up uploaded file
      fs.unlinkSync(file.filepath)

      return res.status(200).json({
        imported: imported.length,
        errors: errors.length,
        details: { imported, errors }
      })
    } catch (error) {
      console.error('Error importing tasks:', error)
      return res.status(500).json({ error: 'Failed to import tasks' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
