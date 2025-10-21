import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { q } = req.query
    const query = (q as string)?.toLowerCase() || ''

    if (!query) {
      return res.status(400).json({ error: 'Query is required' })
    }

    // Get user's boards
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: session.user.id },
      select: { boardId: true }
    })

    const boardIds = userBoards
      .map((b) => b.boardId)
      .filter((id): id is string => Boolean(id))

    if (boardIds.length === 0) {
      return res.status(200).json({
        query,
        tasks: [],
        contacts: [],
        counts: { tasks: 0, contacts: 0 },
        interpretation: {
          filters: [],
          searchTerms: ''
        }
      })
    }

    const appliedFilters: string[] = []
    const andFilters: any[] = [
      { boardId: { in: boardIds } }
    ]

    // Status filters
    if (query.includes('urgent') || query.includes('high priority')) {
      andFilters.push({ priority: 'URGENT' })
      appliedFilters.push('priority: URGENT')
    } else if (query.includes('low priority')) {
      andFilters.push({ priority: 'LOW' })
      appliedFilters.push('priority: LOW')
    }

    if (query.includes('blocked')) {
      andFilters.push({ status: 'BLOCKED' })
      appliedFilters.push('status: BLOCKED')
    } else if (query.includes('in progress') || query.includes('working on')) {
      andFilters.push({ status: 'IN_PROGRESS' })
      appliedFilters.push('status: IN_PROGRESS')
    } else if (query.includes('done') || query.includes('completed')) {
      andFilters.push({ status: 'DONE' })
      appliedFilters.push('status: DONE')
    } else if (query.includes('backlog')) {
      andFilters.push({ status: 'BACKLOG' })
      appliedFilters.push('status: BACKLOG')
    }

    // Time filters
    const now = new Date()
    if (query.includes('today')) {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0))
      const endOfDay = new Date(now.setHours(23, 59, 59, 999))
      andFilters.push({ dueDate: { gte: startOfDay, lte: endOfDay } })
      appliedFilters.push('due today')
    } else if (query.includes('this week')) {
      const startOfWeek = new Date(now)
      startOfWeek.setDate(now.getDate() - now.getDay())
      startOfWeek.setHours(0, 0, 0, 0)
      const endOfWeek = new Date(startOfWeek)
      endOfWeek.setDate(startOfWeek.getDate() + 6)
      endOfWeek.setHours(23, 59, 59, 999)
      andFilters.push({ dueDate: { gte: startOfWeek, lte: endOfWeek } })
      appliedFilters.push('due this week')
    } else if (query.includes('overdue')) {
      andFilters.push({ dueDate: { lt: new Date() } })
      andFilters.push({ status: { not: 'DONE' } })
      appliedFilters.push('overdue')
    }

    // Assignee filters
    if (query.includes('my tasks') || query.includes('assigned to me')) {
      andFilters.push({ assigneeId: session.user.id })
      appliedFilters.push('assigned to me')
    } else if (query.includes('unassigned')) {
      andFilters.push({ assigneeId: null })
      appliedFilters.push('unassigned')
    }

    // Search in title and description
    const searchTerms = query
      .replace(/(urgent|high priority|low priority|blocked|in progress|done|completed|backlog|today|this week|overdue|my tasks|assigned to me|unassigned)/g, '')
      .trim()

    if (searchTerms) {
      andFilters.push({
        OR: [
          { title: { contains: searchTerms, mode: 'insensitive' } },
          { description: { contains: searchTerms, mode: 'insensitive' } }
        ]
      })
    }

    const taskWhere: any = {
      AND: andFilters
    }

    // Search tasks
    const tasks = await prisma.task.findMany({
      where: taskWhere,
      include: {
        board: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            id: true,
            name: true,
            avatar: true
          }
        },
        _count: {
          select: {
            subtasks: true,
            comments: true,
            attachments: true
          }
        }
      },
      orderBy: [
        { priority: 'desc' },
        { updatedAt: 'desc' }
      ],
      take: 50
    })

    // Search contacts/vendors if query suggests it
    let contacts: any[] = []
    if (query.includes('contact') || query.includes('vendor') || query.includes('client')) {
      contacts = await prisma.contact.findMany({
        where: {
          ownerId: session.user.id,
          OR: [
            { firstName: { contains: searchTerms, mode: 'insensitive' } },
            { lastName: { contains: searchTerms, mode: 'insensitive' } },
            { company: { contains: searchTerms, mode: 'insensitive' } },
            { email: { contains: searchTerms, mode: 'insensitive' } }
          ]
        },
        take: 20
      })
    }

    return res.status(200).json({
      query,
      tasks,
      contacts,
      counts: {
        tasks: tasks.length,
        contacts: contacts.length
      },
      interpretation: {
        filters: appliedFilters,
        searchTerms
      }
    })
  } catch (error: any) {
    console.error('Error in smart search:', error)
    return res.status(500).json({ 
      error: 'Search failed',
      details: error.message 
    })
  }
}
