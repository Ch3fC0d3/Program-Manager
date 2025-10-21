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

const VENDOR_COLUMNS = {
  company: ['Company', 'Vendor', 'Name', 'company'],
  category: ['Category', 'category'],
  subcategory: ['Subcategory', 'subcategory'],
  region: ['Region', 'Service Area', 'region'],
  poc: ['Point of Contact', 'POC', 'Contact', 'poc'],
  phone: ['Phone', 'Phone Number', 'phone'],
  email: ['Email', 'email'],
  website: ['Website', 'URL', 'website'],
  status: ['Status', 'status'],
  priority: ['Priority', 'priority'],
  notes: ['Notes', 'notes', 'Description'],
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

    let vendorsBoardId = boardId as string | undefined

    if (!vendorsBoardId) {
      const vendorsBoard = await prisma.board.findFirst({
        where: { name: 'Vendors' },
        select: { id: true }
      })
      vendorsBoardId = vendorsBoard?.id
    }

    for (const row of parsed.data as any[]) {
      try {
        const company = findValue(row, VENDOR_COLUMNS.company)
        if (!company) {
          errors.push({ row, error: 'Company name required' })
          continue
        }

        const priorityValue = findValue(row, VENDOR_COLUMNS.priority)
        const normalizedPriority = typeof priorityValue === 'string'
          ? priorityValue.toUpperCase()
          : undefined

        const task = await prisma.task.create({
          data: {
            boardId: vendorsBoardId || (boardId as string),
            title: company,
            description: [
              findValue(row, VENDOR_COLUMNS.category) ? `Category: ${findValue(row, VENDOR_COLUMNS.category)}` : null,
              findValue(row, VENDOR_COLUMNS.subcategory) ? `Subcategory: ${findValue(row, VENDOR_COLUMNS.subcategory)}` : null,
              findValue(row, VENDOR_COLUMNS.region) ? `Region: ${findValue(row, VENDOR_COLUMNS.region)}` : null,
              findValue(row, VENDOR_COLUMNS.poc) ? `POC: ${findValue(row, VENDOR_COLUMNS.poc)}` : null,
              findValue(row, VENDOR_COLUMNS.phone) ? `Phone: ${findValue(row, VENDOR_COLUMNS.phone)}` : null,
              findValue(row, VENDOR_COLUMNS.email) ? `Email: ${findValue(row, VENDOR_COLUMNS.email)}` : null,
              findValue(row, VENDOR_COLUMNS.website) ? `Website: ${findValue(row, VENDOR_COLUMNS.website)}` : null,
              findValue(row, VENDOR_COLUMNS.notes) ? `Notes: ${findValue(row, VENDOR_COLUMNS.notes)}` : null,
            ].filter(Boolean).join('\n') || null,
            status: 'BACKLOG',
            priority: normalizedPriority === 'HIGH' ? 'HIGH' : normalizedPriority === 'LOW' ? 'LOW' : 'MEDIUM',
            creatorId: session.user.id,
            assigneeId: session.user.id,
            customFields: {
              vendor: {
                category: findValue(row, VENDOR_COLUMNS.category) || null,
                subcategory: findValue(row, VENDOR_COLUMNS.subcategory) || null,
                region: findValue(row, VENDOR_COLUMNS.region) || null,
                poc: findValue(row, VENDOR_COLUMNS.poc) || null,
                phone: findValue(row, VENDOR_COLUMNS.phone) || null,
                email: findValue(row, VENDOR_COLUMNS.email) || null,
                website: findValue(row, VENDOR_COLUMNS.website) || null,
                status: findValue(row, VENDOR_COLUMNS.status) || null,
                priority: priorityValue || null,
                notes: findValue(row, VENDOR_COLUMNS.notes) || null,
              }
            }
          }
        })

        imported.push(task)
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
    console.error('Error importing vendors:', error)
    return res.status(500).json({ error: 'Failed to import vendors' })
  }
}
