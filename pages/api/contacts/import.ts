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

const CONTACT_COLUMNS = {
  firstName: ['First Name', 'first_name', 'firstName'],
  lastName: ['Last Name', 'last_name', 'lastName'],
  email: ['Email', 'email'],
  phone: ['Phone', 'Phone Number', 'phone'],
  company: ['Company', 'Organization', 'company'],
  jobTitle: ['Job Title', 'job_title', 'Title'],
  jobFunction: ['Function', 'Job Function', 'jobFunction'],
  stage: ['Stage', 'Pipeline Stage', 'stage'],
  ownerEmail: ['Owner', 'Owner Email', 'owner'],
  tags: ['Tags', 'labels', 'tags'],
  notes: ['Notes', 'notes'],
}

function findValue(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && row[key] !== '') {
      return row[key]
    }
  }
  return undefined
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
    const form = formidable()

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>((resolve, reject) => {
      form.parse(req, (err, fields, files) => {
        if (err) reject(err)
        else resolve([fields, files])
      })
    })

    const file = Array.isArray(files.file) ? files.file[0] : files.file
    const boardId = Array.isArray(fields.boardId) ? fields.boardId[0] : fields.boardId

    if (!file) {
      return res.status(400).json({ error: 'File is required' })
    }

    const csvContent = fs.readFileSync(file.filepath, 'utf-8')
    const parsed = Papa.parse(csvContent, {
      header: true,
      skipEmptyLines: true,
    })

    const imported: any[] = []
    const errors: any[] = []

    const users = await prisma.user.findMany({
      select: { id: true, email: true, name: true }
    })

    for (const row of parsed.data as any[]) {
      try {
        const firstName = findValue(row, CONTACT_COLUMNS.firstName)
        const lastName = findValue(row, CONTACT_COLUMNS.lastName)

        if (!firstName && !lastName) {
          errors.push({ row, error: 'First or last name required' })
          continue
        }

        const stageValue = findValue(row, CONTACT_COLUMNS.stage)
        const ownerEmail = findValue(row, CONTACT_COLUMNS.ownerEmail)
        const owner = ownerEmail ? users.find(user => user.email === ownerEmail) : null
        const tagsValue = findValue(row, CONTACT_COLUMNS.tags)
        const tags = Array.isArray(tagsValue)
          ? tagsValue
          : typeof tagsValue === 'string'
            ? tagsValue.split(',').map((tag) => tag.trim()).filter(Boolean)
            : []

        const contact = await prisma.contact.create({
          data: {
            firstName: firstName || '',
            lastName: lastName || null,
            email: findValue(row, CONTACT_COLUMNS.email) || null,
            phone: findValue(row, CONTACT_COLUMNS.phone) || null,
            company: findValue(row, CONTACT_COLUMNS.company) || null,
            jobTitle: findValue(row, CONTACT_COLUMNS.jobTitle) || null,
            jobFunction: findValue(row, CONTACT_COLUMNS.jobFunction) || null,
            stage: stageValue || undefined,
            ownerId: owner?.id,
            notes: findValue(row, CONTACT_COLUMNS.notes) || null,
            tags,
            boardId: boardId || null,
          }
        })

        imported.push(contact)
      } catch (error: any) {
        errors.push({ row, error: error.message })
      }
    }

    fs.unlinkSync(file.filepath)

    return res.status(200).json({
      imported: imported.length,
      errors: errors.length,
      details: { imported, errors },
    })
  } catch (error) {
    console.error('Error importing contacts:', error)
    return res.status(500).json({ error: 'Failed to import contacts' })
  }
}
