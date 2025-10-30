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

    // Known quick links based on query context with keyword routing
    const quickLinks: Array<{ label: string; href: string }> = []
    const addQuickLink = (label: string, href: string) => {
      if (!quickLinks.some((link) => link.href === href)) {
        quickLinks.push({ label, href })
      }
    }

    // Task-related keywords
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

    // Financial keywords - Budget
    if (query.includes('budget') || query.includes('budgets') || query.includes('budgeting')) {
      addQuickLink('Budgets', '/financials?tab=budgets')
    }

    // Financial keywords - Estimates
    if (query.includes('estimate') || query.includes('estimates') || query.includes('estimation') || query.includes('quote') || query.includes('quotes')) {
      addQuickLink('Estimates', '/financials?tab=estimates')
    }

    // Financial keywords - Expenses
    if (query.includes('expense') || query.includes('expenses') || query.includes('spending') || query.includes('spend')) {
      addQuickLink('Expenses', '/financials?tab=expenses')
    }

    // Financial keywords - Invoices
    if (query.includes('invoice') || query.includes('invoices') || query.includes('billing') || query.includes('bill')) {
      addQuickLink('Invoices', '/financials?tab=invoices')
    }

    // Financial keywords - Time Tracking
    if (query.includes('time') || query.includes('hours') || query.includes('timesheet') || query.includes('time tracking')) {
      addQuickLink('Time Tracking', '/time')
    }

    // General financial
    if (query.includes('financial') || query.includes('financials') || query.includes('money') || query.includes('cost')) {
      addQuickLink('Financials', '/financials')
    }

    // Contacts/Clients
    if (query.includes('contact') || query.includes('contacts') || query.includes('client') || query.includes('clients') || query.includes('customer')) {
      addQuickLink('Contacts', '/contacts')
    }

    // Vendors
    if (query.includes('vendor') || query.includes('vendors') || query.includes('supplier')) {
      addQuickLink('Vendors', '/vendors')
    }

    // Calendar/Events
    if (query.includes('calendar') || query.includes('event') || query.includes('events') || query.includes('meeting') || query.includes('meetings')) {
      addQuickLink('Calendar', '/calendar')
    }

    // Reports
    if (query.includes('report') || query.includes('reports') || query.includes('analytics') || query.includes('dashboard')) {
      addQuickLink('Dashboard', '/dashboard')
    }

    // Files/Documents
    if (query.includes('file') || query.includes('files') || query.includes('document') || query.includes('documents') || 
        query.includes('upload') || query.includes('pdf') || query.includes('attachment') || query.includes('attachments') ||
        query.includes('download') || query.includes('policy') || query.includes('policies') || query.includes('template') ||
        query.includes('contract') || query.includes('contracts') || query.includes('important files')) {
      addQuickLink('Important Files', '/dashboard#files')
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

    // Files search
    let files: any[] = []
    if (searchTerms || query.includes('file') || query.includes('document') || query.includes('upload') || 
        query.includes('pdf') || query.includes('attachment') || query.includes('policy') || 
        query.includes('template') || query.includes('contract')) {
      try {
        // Check if dashboardFile model exists
        if ((prisma as any).dashboardFile) {
          files = await (prisma as any).dashboardFile.findMany({
            where: {
              deletedAt: null,
              AND: searchTerms
                ? [
                    {
                      OR: [
                        { name: { contains: searchTerms, mode: 'insensitive' } },
                        { description: { contains: searchTerms, mode: 'insensitive' } },
                        { originalName: { contains: searchTerms, mode: 'insensitive' } },
                        { category: { contains: searchTerms, mode: 'insensitive' } }
                      ]
                    }
                  ]
                : []
            },
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true
                }
              }
            },
            orderBy: [
              { isPinned: 'desc' },
              { isImportant: 'desc' },
              { createdAt: 'desc' }
            ],
            take: 20
          })
        }
      } catch (error) {
        console.error('Error searching files:', error)
        // Continue without files if there's an error
      }
    }

    return res.status(200).json({
      query,
      tasks,
      contacts,
      boards,
      vendors,
      expenses,
      budgets,
      files,
      counts: {
        tasks: tasks.length,
        contacts: contacts.length,
        boards: boards.length,
        vendors: vendors.length,
        expenses: expenses.length,
        budgets: budgets.length,
        files: files.length
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
