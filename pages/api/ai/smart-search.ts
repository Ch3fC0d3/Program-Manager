import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const resolveUserId = async () => {
    if (session.user.id) {
      return session.user.id as string
    }

    const email = session.user.email
    if (!email) {
      return null
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true }
    })

    return user?.id ?? null
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

    const currentUserId = await resolveUserId()

    if (!currentUserId) {
      return res.status(403).json({ error: 'User account not found' })
    }

    // Known quick links based on query context
    const quickLinks: Array<{ label: string; href: string }> = []
    const addQuickLink = (label: string, href: string) => {
      if (!quickLinks.some((link) => link.href === href)) {
        quickLinks.push({ label, href })
      }
    }

    if (query.includes('tasks in progress')) {
      addQuickLink('Tasks in Progress', '/tasks?status=IN_PROGRESS')
    }

    if (query.includes('overdue tasks') || (query.includes('overdue') && query.includes('tasks'))) {
      addQuickLink('Overdue Tasks', '/tasks?filter=overdue')
    }

    if (query.includes('completed tasks') || query.includes('tasks completed') || query.includes('done tasks')) {
      addQuickLink('Completed Tasks', '/tasks?status=DONE')
    }

    if (query.includes('tasks')) {
      addQuickLink('All Tasks', '/tasks')
    }

    // Get user's boards
    const userBoards = await prisma.boardMember.findMany({
      where: { userId: currentUserId },
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
        counts: {
          tasks: 0,
          contacts: 0
        },
        interpretation: {
          filters: [],
          searchTerms: ''
        },
        quickLinks
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
      andFilters.push({ assigneeId: currentUserId })
      appliedFilters.push('assigned to me')
    } else if (query.includes('unassigned')) {
      andFilters.push({ assigneeId: null })
      appliedFilters.push('unassigned')
    }

    // Search in title and description
    let searchTerms = query
      .replace(/(urgent|high priority|low priority|blocked|in progress|done|completed|backlog|today|this week|overdue|my tasks|assigned to me|unassigned)/g, '')
      .trim()

    if (searchTerms) {
      searchTerms = searchTerms
        .replace(/\b(show me|show|find|get|list|please|items?|things?)\b/g, '')
        .replace(/\b(tasks?|due|my)\b/g, '')
        .replace(/\s+/g, ' ')
        .trim()
    }

    if (searchTerms === 'tasks' && quickLinks.length > 0) {
      searchTerms = ''
    }

    if (searchTerms.length > 0 && searchTerms.length < 3) {
      searchTerms = ''
    }

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

    // Boards search
    let boards: any[] = []
    if (searchTerms) {
      boards = await prisma.board.findMany({
        where: {
          id: { in: boardIds },
          OR: [
            { name: { contains: searchTerms, mode: 'insensitive' } },
            { description: { contains: searchTerms, mode: 'insensitive' } }
          ]
        },
        select: {
          id: true,
          name: true,
          description: true,
          color: true
        },
        take: 12
      })
    }

    // Contacts search
    let contacts: any[] = []
    if (searchTerms || query.includes('contact') || query.includes('client')) {
      contacts = await prisma.contact.findMany({
        where: {
          OR: [
            { ownerId: currentUserId },
            { boardId: { in: boardIds } }
          ],
          AND: searchTerms
            ? [
                {
                  OR: [
                    { firstName: { contains: searchTerms, mode: 'insensitive' } },
                    { lastName: { contains: searchTerms, mode: 'insensitive' } },
                    { company: { contains: searchTerms, mode: 'insensitive' } },
                    { email: { contains: searchTerms, mode: 'insensitive' } }
                  ]
                }
              ]
            : []
        },
        include: {
          board: {
            select: {
              id: true,
              name: true
            }
          }
        },
        take: 20
      })
    }

    // Vendor search
    let vendors: any[] = []
    if (searchTerms || query.includes('vendor')) {
      vendors = await prisma.vendor.findMany({
        where: {
          OR: [
            {
              contact: {
                OR: [
                  { ownerId: currentUserId },
                  { boardId: { in: boardIds } }
                ]
              }
            },
            {
              contactId: null
            }
          ],
          AND: searchTerms
            ? [
                {
                  OR: [
                    { name: { contains: searchTerms, mode: 'insensitive' } },
                    { email: { contains: searchTerms, mode: 'insensitive' } },
                    { phone: { contains: searchTerms, mode: 'insensitive' } },
                    { notes: { contains: searchTerms, mode: 'insensitive' } }
                  ]
                }
              ]
            : []
        },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
              email: true
            }
          }
        },
        take: 20
      })
    }

    // Expenses search
    let expenses: any[] = []
    if (searchTerms || query.includes('expense') || query.includes('spend')) {
      expenses = await prisma.expense.findMany({
        where: {
          OR: [
            { boardId: { in: boardIds } },
            { createdById: currentUserId }
          ],
          AND: searchTerms
            ? [
                {
                  OR: [
                    { description: { contains: searchTerms, mode: 'insensitive' } },
                    { category: { contains: searchTerms, mode: 'insensitive' } },
                    { aiVendorName: { contains: searchTerms, mode: 'insensitive' } }
                  ]
                }
              ]
            : []
        },
        select: {
          id: true,
          amount: true,
          currency: true,
          description: true,
          date: true,
          category: true,
          board: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { date: 'desc' },
        take: 20
      })
    }

    // Budgets search
    let budgets: any[] = []
    if (searchTerms || query.includes('budget')) {
      budgets = await prisma.budget.findMany({
        where: {
          OR: [
            { boardId: { in: boardIds } },
            { createdById: currentUserId }
          ],
          AND: searchTerms
            ? [
                {
                  OR: [
                    { name: { contains: searchTerms, mode: 'insensitive' } },
                    { category: { contains: searchTerms, mode: 'insensitive' } }
                  ]
                }
              ]
            : []
        },
        select: {
          id: true,
          name: true,
          amount: true,
          currency: true,
          category: true,
          startDate: true,
          endDate: true,
          board: {
            select: {
              id: true,
              name: true
            }
          }
        },
        orderBy: { updatedAt: 'desc' },
        take: 20
      })
    }

    return res.status(200).json({
      query,
      tasks,
      contacts,
      boards,
      vendors,
      expenses,
      budgets,
      counts: {
        tasks: tasks.length,
        contacts: contacts.length,
        boards: boards.length,
        vendors: vendors.length,
        expenses: expenses.length,
        budgets: budgets.length
      },
      interpretation: {
        filters: appliedFilters,
        searchTerms
      },
      quickLinks
    })
  } catch (error) {
    console.error('Smart search failed:', error)
    return res.status(500).json({ error: 'Failed to perform smart search' })
  }
}
