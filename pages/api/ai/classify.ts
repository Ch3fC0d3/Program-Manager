import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { Prisma, TaskStatus, Priority } from '@prisma/client'
import fs from 'fs'
import path from 'path'
import pdfParse from 'pdf-parse'
import { createClient } from '@supabase/supabase-js'

const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || 'hf_'
const HF_MODEL = 'mistralai/Mistral-7B-Instruct-v0.2'

const startOfDay = (date: Date) => {
  const copy = new Date(date)
  copy.setHours(0, 0, 0, 0)
  return copy
}

const sanitizeText = (value: string) => value.replace(/\u0000/g, '')

const sanitizeNullable = (value?: string | null) => {
  if (value === null || value === undefined) return null
  return sanitizeText(value)
}

const sanitizeLabels = (labels?: string[] | null) => {
  if (!labels) return []
  return labels.map((label) => sanitizeText(label))
}

const normalizeDateInput = (value?: string | null) => {
  if (!value) return null
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return null
  return startOfDay(parsed)
}

const parseDueDateFromText = (text: string) => {
  const cleanedText = sanitizeText(text)
  const base = startOfDay(new Date())
  const lower = cleanedText.toLowerCase()
  if (lower.includes('day after tomorrow')) {
    const date = new Date(base)
    date.setDate(date.getDate() + 2)
    return date
  }
  if (lower.includes('tomorrow')) {
    const date = new Date(base)
    date.setDate(date.getDate() + 1)
    return date
  }
  if (lower.includes('today')) return base
  const inDays = lower.match(/in\s+(\d+)\s+days?/)
  if (inDays) {
    const offset = parseInt(inDays[1], 10)
    if (!Number.isNaN(offset)) {
      const date = new Date(base)
      date.setDate(date.getDate() + offset)
      return date
    }
  }
  if (lower.includes('next week')) {
    const date = new Date(base)
    date.setDate(date.getDate() + 7)
    return date
  }
  if (lower.includes('next month')) {
    const date = new Date(base)
    date.setMonth(date.getMonth() + 1)
    return date
  }
  const weekdays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday']
  const weekdayMatch = lower.match(/(?:next|this)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/)
  if (weekdayMatch) {
    const target = weekdays.indexOf(weekdayMatch[1])
    if (target >= 0) {
      const current = base.getDay()
      let diff = target - current
      if (diff <= 0) diff += 7
      if (weekdayMatch[0].startsWith('this') && diff === 7) diff = 0
      const date = new Date(base)
      date.setDate(date.getDate() + diff)
      return date
    }
  }
  const isoMatch = cleanedText.match(/\b(\d{4}-\d{1,2}-\d{1,2})\b/)
  if (isoMatch) {
    const parsed = normalizeDateInput(isoMatch[1])
    if (parsed) return parsed
  }
  const shortMatch = cleanedText.match(/\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/)
  if (shortMatch) {
    const parsed = normalizeDateInput(shortMatch[1])
    if (parsed) return parsed
  }
  const months = ['january','february','march','april','may','june','july','august','september','october','november','december']
  const monthRegex = new RegExp(`(${months.join('|')})\s+(\d{1,2})(?:,\s*(\d{4}))?`, 'i')
  const monthMatch = cleanedText.match(monthRegex)
  if (monthMatch) {
    const month = months.indexOf(monthMatch[1].toLowerCase())
    if (month >= 0) {
      const day = parseInt(monthMatch[2], 10)
      const year = monthMatch[3] ? parseInt(monthMatch[3], 10) : base.getFullYear()
      if (!Number.isNaN(day) && day >= 1 && day <= 31 && !Number.isNaN(year)) {
        const date = startOfDay(new Date(year, month, day))
        if (!Number.isNaN(date.getTime())) return date
      }
    }
  }
  return null
}

const resolveDueDate = (aiValue: string | null | undefined, content: string, description?: string | null) => {
  const aiDate = normalizeDateInput(aiValue)
  if (aiDate) return aiDate
  return parseDueDateFromText(`${sanitizeText(content)}\n${sanitizeNullable(description) || ''}`)
}

const parseAmount = (value?: string | number | null) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(',', '')
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

const readAttachmentContent = async (attachment?: AttachmentMeta | null) => {
  if (!attachment?.id) return null

  try {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const bucket = process.env.UPLOAD_BUCKET

    if (!supabaseUrl || !supabaseKey || !bucket) {
      console.warn('Supabase storage not configured, skipping attachment read')
      return null
    }

    const supabase = createClient(supabaseUrl, supabaseKey)
    
    // Download from Supabase Storage
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .download(`ai/${attachment.id}`)

    if (error || !data) {
      console.warn('Failed to download attachment from Supabase:', error)
      return null
    }

    const buffer = Buffer.from(await data.arrayBuffer())

    // Handle PDF files
    if (attachment.mimeType?.includes('pdf') || attachment.originalName?.toLowerCase().endsWith('.pdf')) {
      const parsed = await pdfParse(buffer)
      return sanitizeText(parsed.text || '')
    }

    // Handle Excel files
    if (
      attachment.mimeType?.includes('spreadsheet') ||
      attachment.mimeType?.includes('excel') ||
      attachment.originalName?.toLowerCase().endsWith('.xlsx') ||
      attachment.originalName?.toLowerCase().endsWith('.xls')
    ) {
      const XLSX = require('xlsx')
      const workbook = XLSX.read(buffer, { type: 'buffer' })
      let allText = ''
      
      // Read all sheets
      workbook.SheetNames.forEach((sheetName: string) => {
        const sheet = workbook.Sheets[sheetName]
        const csv = XLSX.utils.sheet_to_csv(sheet)
        allText += `\n--- Sheet: ${sheetName} ---\n${csv}\n`
      })
      
      return sanitizeText(allText)
    }

    // Default: read as text
    return sanitizeText(buffer.toString('utf8'))
  } catch (error) {
    console.error('Failed to read attachment content:', error)
    return null
  }
}

interface AIEntityBase {
  type: 'task' | 'vendor' | 'contact' | 'expense'
  confidence?: number
}

interface AITaskEntity extends AIEntityBase {
  type: 'task'
  title?: string
  description?: string
  boardName?: string
  priority?: string
  status?: string
  labels?: string[]
  summary?: string
  dueDate?: string
}

interface AIVendorEntity extends AIEntityBase {
  type: 'vendor'
  name?: string
  email?: string
  phone?: string
  company?: string
  notes?: string
  summary?: string
  address?: string
}

interface AIContactEntity extends AIEntityBase {
  type: 'contact'
  name?: string
  email?: string
  phone?: string
  company?: string
  title?: string
  notes?: string
  summary?: string
  address?: string
}

interface AIExpenseLineItem {
  description: string
  quantity?: number
  rate?: number
  total?: number
}

interface AIExpenseEntity extends AIEntityBase {
  type: 'expense'
  amount?: number | string
  currency?: string
  category?: string
  description?: string
  date?: string
  vendorName?: string
  linkToTask?: boolean
  subtotal?: number | string
  tax?: number | string
  total?: number | string
  lineItems?: AIExpenseLineItem[]
}

type AIEntity = AITaskEntity | AIVendorEntity | AIContactEntity | AIExpenseEntity

interface AttachmentMeta {
  id: string
  filename: string
  originalName: string
  mimeType: string
  size: number
  url: string
  storedAt?: string
}

const ensureArray = (value: any): AIEntity[] => {
  if (!value) return []
  if (Array.isArray(value)) return value
  if (typeof value === 'object') return [value as AIEntity]
  return []
}

const parseNumber = (value?: number | string | null) => {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  const cleaned = String(value).replace(/[^0-9.,-]/g, '').replace(',', '')
  const parsed = parseFloat(cleaned)
  return Number.isFinite(parsed) ? parsed : null
}

interface ExtractedContactInfo {
  emails: string[]
  phones: string[]
  addresses: string[]
}

const extractContactInfo = (content: string): ExtractedContactInfo => {
  const emails = Array.from(new Set((content.match(/[\w.-]+@[\w.-]+\.\w+/g) || []).map((e) => e.trim().toLowerCase())))

  const phoneRegex = /(\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4})/g
  const phones = Array.from(
    new Set(
      (content.match(phoneRegex) || [])
        .map((p) => p.replace(/[^0-9]/g, ''))
        .filter((digits) => digits.length === 10)
        .map((digits) => digits.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3'))
    )
  )

  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  const addresses = new Set<string>()

  lines.forEach((line, index) => {
    if (/\b\d{5}(?:-\d{4})?\b/.test(line)) {
      const block: string[] = []
      const prevTwo = lines[index - 2]
      const prevOne = lines[index - 1]
      if (prevTwo && !/estimate|sales\s*tax|total/i.test(prevTwo)) block.push(prevTwo)
      if (prevOne && !/estimate|sales\s*tax|total/i.test(prevOne)) block.push(prevOne)
      block.push(line)
      const nextLine = lines[index + 1]
      if (nextLine && nextLine.length <= 80 && !/total|signature/i.test(nextLine.toLowerCase())) {
        block.push(nextLine)
      }
      const deduped = Array.from(new Set(block)).join(', ')
      if (deduped.length) addresses.add(deduped)
    }
  })

  const nameAddressIndex = lines.findIndex((line) => /name\s*\/\s*address/i.test(line))
  if (nameAddressIndex >= 0) {
    const block: string[] = []
    for (let i = nameAddressIndex + 1; i < lines.length; i++) {
      const current = lines[i]
      if (!current || /job location/i.test(current)) break
      block.push(current)
      if (block.length >= 4) break
    }
    if (block.length) {
      addresses.add(block.join(', '))
    }
  }

  return {
    emails,
    phones,
    addresses: Array.from(addresses)
  }
}

const fallbackEntities = (content: string, extracted: ExtractedContactInfo): AIEntity[] => {
  const lower = content.toLowerCase()
  
  // Check for vendor keywords
  if (lower.includes('invoice') || lower.includes('receipt') || lower.includes('amount')) {
    const amountMatch = content.match(/\$?\s*([0-9.,]+)/)
    const amount = amountMatch ? parseNumber(amountMatch[1]) : null
    return [
      {
        type: 'task',
        title: content.split('\n')[0].substring(0, 100) || 'Untitled Task',
        description: content.substring(0, 500),
        priority: 'MEDIUM',
        status: 'BACKLOG',
        summary: 'Created from AI content',
        confidence: 0.6
      },
      {
        type: 'expense',
        amount: amount || undefined,
        description: content.substring(0, 120),
        category: 'Uncategorized',
        subtotal: amount || undefined,
        total: amount || undefined,
        confidence: 0.5
      }
    ]
  }
  if (lower.includes('vendor') || lower.includes('supplier')) {
    return [
      {
        type: 'task',
        title: content.split('\n')[0].substring(0, 100) || 'Untitled Task',
        description: content.substring(0, 500),
        priority: 'MEDIUM',
        status: 'BACKLOG',
        summary: 'Created from AI content',
        confidence: 0.6
      },
      {
        type: 'vendor',
        name: sanitizeText(content.split('\n')[0].substring(0, 60)),
        email: sanitizeNullable(extracted.emails[0] || content.match(/[\w.-]+@[\w.-]+\.\w+/)?.[0]) || '',
        phone: sanitizeNullable(
          extracted.phones[0] || content.match(/\d{3}[-.]?\d{3}[-.]?\d{4}/)?.[0]
        ) || '',
        company: sanitizeText(content.split('\n')[0].substring(0, 60)),
        notes: sanitizeText(content.substring(0, 500)),
        address: extracted.addresses[0] || undefined,
        summary: 'Classified as vendor based on content',
        confidence: 0.6
      }
    ]
  }
  // Default to task
  return [
    {
      type: 'task',
      title: content.split('\n')[0].substring(0, 100) || 'Untitled Task',
      description: content.substring(0, 500),
      priority: 'MEDIUM',
      status: 'BACKLOG',
      summary: 'Created from AI content',
      confidence: 0.6
    }
  ]
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
    const { content, fileName, fileType, attachment } = req.body as {
      content?: string
      fileName?: string
      fileType?: string
      attachment?: AttachmentMeta | null
    }

    let safeContent = content ? sanitizeText(content) : ''

    if ((!safeContent || safeContent.trim().length === 0) && attachment) {
      const attachmentText = await readAttachmentContent(attachment)
      if (attachmentText) {
        safeContent = attachmentText
      }
    }

    if (!safeContent || safeContent.trim().length === 0) {
      return res.status(400).json({ error: 'Content is required' })
    }

    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      include: {
        board: {
          select: {
            id: true,
            name: true,
            description: true
          }
        }
      }
    })

    const boardsContext = userBoards
      .map((b) => `- ${b.board.name}: ${b.board.description || 'No description'}`)
      .join('\n')

    const prompt = `You are an AI assistant that helps classify and organize content into tasks, vendors, contacts, and expenses.

Available boards:
${boardsContext}

Analyze the provided content and determine:
1. Relevant entities present (task, vendor, contact, expense)
2. Extract structured fields for each entity

Classification Guidelines:
- **Contact**: Email signatures, business cards, personal introductions, networking info, resumes
- **Vendor**: Invoices, estimates, quotes, supplier information with pricing
- **Task**: Action items, to-dos, project requirements, work assignments
- **Expense**: Receipts, bills, payment records

${fileName ? `File: ${fileName}
Type: ${fileType}

` : ''}Content:
${safeContent}

Respond ONLY with valid JSON array. Include one object per entity detected. Each object must include "type" and the fields listed below:

Task entity fields:
{
  "type": "task",
  "title": "string",
  "description": "string",
  "boardName": "string",
  "priority": "URGENT|HIGH|MEDIUM|LOW",
  "status": "BACKLOG|NEXT_7_DAYS|IN_PROGRESS|BLOCKED|DONE",
  "labels": ["string"],
  "summary": "string",
  "confidence": 0.95,
  "dueDate": "YYYY-MM-DD"
}

Vendor/Contact entity fields:
{
  "type": "vendor" | "contact",
  "name": "string",
  "email": "string",
  "phone": "string",
  "company": "string",
  "title": "string",
  "address": "string",
  "notes": "string",
  "summary": "string",
  "confidence": 0.95
}

Expense entity fields:
{
  "type": "expense",
  "vendorName": "string",
  "description": "string",
  "category": "string",
  "amount": 0,
  "currency": "USD",
  "subtotal": 0,
  "tax": 0,
  "total": 0,
  "date": "YYYY-MM-DD",
  "lineItems": [
    {
      "description": "string",
      "quantity": 0,
      "rate": 0,
      "total": 0
    }
  ],
  "confidence": 0.9
}`

    let aiResponse: AIEntity[] | null = null

    try {
      const response = await fetch(`https://api-inference.huggingface.co/models/${HF_MODEL}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${HF_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 500,
            temperature: 0.3,
            return_full_text: false
          }
        })
      })

      if (!response.ok) {
        console.warn(`HuggingFace API error: ${response.statusText}, using fallback`)
        throw new Error('AI API unavailable')
      }

      const hfResponse = await response.json()

      if (hfResponse.error && hfResponse.error.includes('loading')) {
        console.warn('Model is loading, using fallback')
        throw new Error('Model loading')
      }

      const generatedText = hfResponse[0]?.generated_text || ''
      const jsonMatch = generatedText.match(/\[[\s\S]*\]|\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        aiResponse = ensureArray(parsed)
      }
    } catch (error) {
      console.warn('AI classification failed, using fallback:', error)
      aiResponse = null
    }

    const extractedInfo = extractContactInfo(safeContent)

    if (!aiResponse) {
      aiResponse = fallbackEntities(safeContent, extractedInfo)
    }

    const hasContactEntity = aiResponse.some((entity) => entity.type === 'vendor' || entity.type === 'contact')

    if (!hasContactEntity) {
      const lines = safeContent
        .split(/\r?\n/)
        .map((line) => sanitizeText(line.trim()))
        .filter((line) => line.length > 0)

      const nameIndex = lines.findIndex((line) => /name\s*\/\s*address/i.test(line))
      const nameCandidate = nameIndex >= 0 && lines[nameIndex + 1] ? lines[nameIndex + 1] : lines[0] || 'Unknown Contact'
      const companyCandidate = lines.find((line) => /inc\.|llc|ltd|company|services|drill|tech|corp/i.test(line)) || nameCandidate

      aiResponse.push({
        type: 'contact',
        name: nameCandidate.substring(0, 80),
        email: extractedInfo.emails[0],
        phone: extractedInfo.phones[0],
        company: companyCandidate.substring(0, 100),
        notes: safeContent.substring(0, 500),
        summary: 'Inferred contact from document content',
        confidence: 0.45,
        address: extractedInfo.addresses[0]
      })
    }

    const createdTasks: any[] = []
    const createdContacts: any[] = []
    const createdVendors: any[] = []
    const createdExpenses: any[] = []

    for (const entity of aiResponse) {
      if (entity.type === 'vendor' || entity.type === 'contact') {
        // Use transaction to ensure contact and vendor are created/updated atomically
        const result = await prisma.$transaction(async (tx) => {
          const email = sanitizeNullable(entity.email) || extractedInfo.emails[0] || null
          let existingContact = email
            ? await tx.contact.findFirst({ where: { email: email.toLowerCase() } })
            : null

          const nameParts = (entity.name || '').split(' ').filter(Boolean)
          const firstName = sanitizeText(nameParts[0] || entity.company || 'Contact')
          const lastName = sanitizeNullable(nameParts.slice(1).join(' '))

          const inferredPhone = sanitizeNullable(entity.phone) || extractedInfo.phones[0] || null
          const inferredAddress = 'address' in entity && entity.address
            ? sanitizeNullable(entity.address)
            : extractedInfo.addresses[0] || null
          const baseNotes = sanitizeNullable(entity.notes || entity.summary)
          const combinedNotes = inferredAddress
            ? [baseNotes, `Address: ${inferredAddress}`].filter(Boolean).join('\n\n')
            : baseNotes

          if (existingContact) {
            existingContact = await tx.contact.update({
              where: { id: existingContact.id },
              data: {
                phone: inferredPhone || existingContact.phone,
                company: sanitizeNullable(entity.company) || existingContact.company,
                notes: combinedNotes || existingContact.notes,
                jobTitle: sanitizeNullable('title' in entity ? entity.title : undefined) || existingContact.jobTitle,
                isVendor: entity.type === 'vendor' ? true : existingContact.isVendor
              }
            })
          } else {
            existingContact = await tx.contact.create({
              data: {
                firstName,
                lastName,
                email,
                phone: inferredPhone,
                company: sanitizeNullable(entity.company),
                jobTitle: sanitizeNullable('title' in entity ? entity.title : undefined),
                notes: combinedNotes,
                isVendor: entity.type === 'vendor',
                ownerId: session.user.id,
                tags: []
              }
            })
          }

          let vendorRecord = null
          if (entity.type === 'vendor' && existingContact) {
            const vendorName = sanitizeNullable(entity.company) || sanitizeNullable(entity.name) || existingContact.company || `${firstName} ${lastName || ''}`.trim()
            vendorRecord = await tx.vendor.upsert({
              where: { contactId: existingContact.id },
              update: {
                name: vendorName || 'Vendor',
                email,
                phone: inferredPhone || undefined,
                notes: combinedNotes || undefined
              },
              create: {
                contactId: existingContact.id,
                name: vendorName || 'Vendor',
                email,
                phone: inferredPhone || undefined,
                notes: combinedNotes || undefined,
                tags: []
              }
            })
          }

          return { contact: existingContact, vendor: vendorRecord }
        })

        createdContacts.push(result.contact)
        if (result.vendor) {
          createdVendors.push(result.vendor)
        }
      }

      if (entity.type === 'expense') {
        const amount = parseNumber(entity.amount)
        const subtotal = parseNumber(entity.subtotal) || amount
        const tax = parseNumber(entity.tax)
        const total = parseNumber(entity.total) || (subtotal !== null && tax !== null ? subtotal + tax : amount)

        const lineItems = (entity.lineItems || []).map((item) => ({
          description: sanitizeText(item.description || ''),
          quantity: item.quantity ?? null,
          rate: item.rate ?? null,
          total: item.total ?? null
        }))

        const aiExtractedPayload: Prisma.JsonObject = {
          subtotal: subtotal ?? null,
          tax: tax ?? null,
          total: total ?? null,
          lineItems: lineItems as unknown as Prisma.JsonValue,
          raw: entity as unknown as Prisma.JsonValue
        }

        const expense = await prisma.expense.create({
          data: {
            amount: total || subtotal || amount || 0,
            currency: entity.currency || 'USD',
            category: entity.category || 'Uncategorized',
            description: entity.description || `Expense captured from ${fileName || 'AI content'}`,
            receiptUrl: attachment?.url,
            aiVendorName: entity.vendorName,
            aiConfidence: entity.confidence || 0.6,
            aiExtractedData: aiExtractedPayload,
            createdById: session.user.id
          }
        })

        createdExpenses.push(expense)
      }

      if (entity.type === 'task') {
        const statusValue = entity.status && Object.values(TaskStatus).includes(entity.status as TaskStatus)
          ? (entity.status as TaskStatus)
          : TaskStatus.BACKLOG
        const priorityValue = entity.priority && Object.values(Priority).includes(entity.priority as Priority)
          ? (entity.priority as Priority)
          : Priority.MEDIUM

        const matchedBoard = userBoards.find(b =>
          b.board.name.toLowerCase() === entity.boardName?.toLowerCase()
        )

        const boardId = matchedBoard?.board.id || userBoards[0]?.board.id

        if (!boardId) {
          continue
        }

        const lastTask = await prisma.task.findFirst({
          where: { boardId, status: statusValue },
          orderBy: { position: 'desc' }
        })

        const position = lastTask ? lastTask.position + 1 : 0

        const dueDate = resolveDueDate(entity.dueDate, safeContent, entity.description)

        const task = await prisma.task.create({
          data: {
            title: sanitizeNullable(entity.title) || 'Untitled Task',
            description: sanitizeNullable(entity.description) || sanitizeNullable(safeContent.substring(0, 500)),
            boardId,
            creatorId: session.user.id,
            status: statusValue,
            priority: priorityValue,
            aiSummary: sanitizeNullable(entity.summary),
            aiLabels: sanitizeLabels(entity.labels),
            aiConfidence: entity.confidence || 0.8,
            position,
            dueDate
          },
          include: {
            board: {
              select: {
                id: true,
                name: true,
                color: true
              }
            }
          }
        })

        await prisma.activity.create({
          data: {
            taskId: task.id,
            userId: session.user.id,
            action: 'created',
            details: {
              title: sanitizeText(task.title),
              source: 'AI Classification',
              fileName: fileName || null
            }
          }
        })

        createdTasks.push(task)
      }
    }

    const primaryType = aiResponse[0]?.type || (createdTasks.length ? 'task' : createdContacts.length ? 'contact' : createdVendors.length ? 'vendor' : createdExpenses.length ? 'expense' : 'task')

    return res.status(200).json({
      type: primaryType,
      task: createdTasks[0] || null,
      contact: createdContacts[0] || null,
      vendor: createdVendors[0] || null,
      expense: createdExpenses[0] || null,
      tasks: createdTasks,
      contacts: createdContacts,
      vendors: createdVendors,
      expenses: createdExpenses,
      attachment,
      aiEntities: aiResponse
    })
  } catch (error: any) {
    console.error('Error classifying content:', error)
    
    return res.status(500).json({ 
      error: 'Failed to classify content',
      details: error.message 
    })
  }
}
