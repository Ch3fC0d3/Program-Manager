import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10)
  
  const admin = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: hashedPassword,
      role: 'ADMIN',
    },
  })

  console.log('✅ Created admin user:', admin.email)

  // Create demo users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'john@example.com' },
      update: {},
      create: {
        email: 'john@example.com',
        name: 'John Doe',
        password: hashedPassword,
        role: 'MEMBER',
      },
    }),
    prisma.user.upsert({
      where: { email: 'jane@example.com' },
      update: {},
      create: {
        email: 'jane@example.com',
        name: 'Jane Smith',
        password: hashedPassword,
        role: 'MEMBER',
      },
    }),
  ])

  console.log('✅ Created demo users')

  // Create demo board
  const board = await prisma.board.create({
    data: {
      name: 'Water & Helium Operations',
      description: 'Main project board for water desalination and helium operations',
      color: '#3b82f6',
      members: {
        create: [
          { userId: admin.id, role: 'OWNER' },
          { userId: users[0].id, role: 'MEMBER' },
          { userId: users[1].id, role: 'MEMBER' },
        ],
      },
    },
  })

  console.log('✅ Created demo board:', board.name)

  // Create labels
  const labels = await Promise.all([
    prisma.label.create({
      data: {
        name: 'Helium',
        color: '#8b5cf6',
        category: 'Helium',
        boardId: board.id,
      },
    }),
    prisma.label.create({
      data: {
        name: 'Water/Desal',
        color: '#3b82f6',
        category: 'Water/Desal',
        boardId: board.id,
      },
    }),
    prisma.label.create({
      data: {
        name: 'Community',
        color: '#10b981',
        category: 'Community',
        boardId: board.id,
      },
    }),
    prisma.label.create({
      data: {
        name: 'Vendors',
        color: '#f59e0b',
        category: 'Vendors',
        boardId: board.id,
      },
    }),
    prisma.label.create({
      data: {
        name: 'Finance/Legal',
        color: '#ef4444',
        category: 'Finance/Legal',
        boardId: board.id,
      },
    }),
  ])

  console.log('✅ Created labels')

  // Create demo tasks
  const tasks = await Promise.all([
    prisma.task.create({
      data: {
        title: 'Drill water well at Site A',
        description: 'Complete drilling operations for new water well. Depth: 500ft, Expected flow: 50 GPM',
        status: 'IN_PROGRESS',
        priority: 'HIGH',
        boardId: board.id,
        creatorId: admin.id,
        assigneeId: users[0].id,
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        customFields: {
          wellId: 'WW-001',
          depth: '500ft',
          expectedFlow: '50 GPM',
          location: '34.0522° N, 118.2437° W'
        },
        labels: {
          create: [{ labelId: labels[1].id }], // Water/Desal
        },
      },
    }),
    prisma.task.create({
      data: {
        title: 'Helium vendor outreach - Q1',
        description: 'Contact potential helium suppliers for pricing and availability',
        status: 'NEXT_7_DAYS',
        priority: 'MEDIUM',
        boardId: board.id,
        creatorId: admin.id,
        assigneeId: users[1].id,
        dueDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        labels: {
          create: [
            { labelId: labels[0].id }, // Helium
            { labelId: labels[3].id }, // Vendors
          ],
        },
      },
    }),
    prisma.task.create({
      data: {
        title: 'Community meeting preparation',
        description: 'Prepare presentation materials for upcoming community stakeholder meeting',
        status: 'BACKLOG',
        priority: 'MEDIUM',
        boardId: board.id,
        creatorId: admin.id,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        labels: {
          create: [{ labelId: labels[2].id }], // Community
        },
      },
    }),
    prisma.task.create({
      data: {
        title: 'Review RO skid specifications',
        description: 'Technical review of reverse osmosis skid specifications from vendor',
        status: 'BLOCKED',
        priority: 'URGENT',
        boardId: board.id,
        creatorId: admin.id,
        assigneeId: users[0].id,
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        labels: {
          create: [
            { labelId: labels[1].id }, // Water/Desal
            { labelId: labels[3].id }, // Vendors
          ],
        },
      },
    }),
    prisma.task.create({
      data: {
        title: 'Finalize MOU with Chapter 3',
        description: 'Complete legal review and finalize memorandum of understanding',
        status: 'DONE',
        priority: 'HIGH',
        boardId: board.id,
        creatorId: admin.id,
        assigneeId: users[1].id,
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2 days ago
        labels: {
          create: [
            { labelId: labels[2].id }, // Community
            { labelId: labels[4].id }, // Finance/Legal
          ],
        },
      },
    }),
  ])

  console.log('✅ Created demo tasks')

  // Create checklists for first task
  await prisma.checklist.create({
    data: {
      title: 'Pre-drilling checklist',
      taskId: tasks[0].id,
      position: 0,
      items: {
        create: [
          { text: 'Obtain drilling permit', completed: true, position: 0 },
          { text: 'Site survey completed', completed: true, position: 1 },
          { text: 'Equipment mobilization', completed: false, position: 2 },
          { text: 'Safety briefing', completed: false, position: 3 },
        ],
      },
    },
  })

  console.log('✅ Created checklists')

  // Create comments
  await prisma.comment.create({
    data: {
      content: 'Drilling rig arrived on site. Starting operations tomorrow morning.',
      taskId: tasks[0].id,
      userId: users[0].id,
    },
  })

  console.log('✅ Created comments')

  // Create activities
  await Promise.all(
    tasks.map((task) =>
      prisma.activity.create({
        data: {
          taskId: task.id,
          userId: admin.id,
          action: 'created',
          details: { title: task.title },
        },
      })
    )
  )

  console.log('✅ Created activities')

  // Create template
  await prisma.template.create({
    data: {
      name: 'Water Well Drilling Project',
      description: 'Standard template for water well drilling operations',
      boardId: board.id,
      creatorId: admin.id,
      data: {
        tasks: [
          { title: 'Site survey and assessment', status: 'BACKLOG' },
          { title: 'Obtain drilling permits', status: 'BACKLOG' },
          { title: 'Equipment mobilization', status: 'BACKLOG' },
          { title: 'Drilling operations', status: 'BACKLOG' },
          { title: 'Well testing and analysis', status: 'BACKLOG' },
          { title: 'Final documentation', status: 'BACKLOG' },
        ],
        checklists: [
          {
            title: 'Safety Requirements',
            items: ['Safety briefing', 'PPE inspection', 'Emergency contacts', 'First aid kit'],
          },
        ],
      },
    },
  })

  console.log('✅ Created template')

  // Create sample contacts/vendors
  const vendor1 = await prisma.contact.create({
    data: {
      firstName: 'ABC',
      lastName: 'Drilling Co',
      email: 'contact@abcdrilling.com',
      phone: '555-0100',
      company: 'ABC Drilling Company',
      jobTitle: 'Operations Manager',
      stage: 'ACTIVE',
      isVendor: true,
      boardId: board.id,
      ownerId: admin.id,
      tags: ['drilling', 'water'],
    },
  })

  const vendor2 = await prisma.contact.create({
    data: {
      firstName: 'Helium',
      lastName: 'Suppliers Inc',
      email: 'sales@heliumsuppliers.com',
      phone: '555-0200',
      company: 'Helium Suppliers Inc',
      jobTitle: 'Sales Director',
      stage: 'ACTIVE',
      isVendor: true,
      boardId: board.id,
      ownerId: admin.id,
      tags: ['helium', 'gas-supplier'],
    },
  })

  console.log('✅ Created vendor contacts')

  // Create vendor profiles
  await prisma.vendor.create({
    data: {
      name: 'ABC Drilling Company',
      email: 'contact@abcdrilling.com',
      phone: '555-0100',
      website: 'https://abcdrilling.com',
      contactId: vendor1.id,
      tags: ['drilling', 'water', 'preferred-vendor'],
      notes: 'Primary drilling contractor for water well projects',
    },
  })

  await prisma.vendor.create({
    data: {
      name: 'Helium Suppliers Inc',
      email: 'sales@heliumsuppliers.com',
      phone: '555-0200',
      website: 'https://heliumsuppliers.com',
      contactId: vendor2.id,
      tags: ['helium', 'gas-supplier', 'certified'],
      notes: 'Certified helium supplier with competitive pricing',
    },
  })

  console.log('✅ Created vendor profiles')

  // Create current quarter budget
  const now = new Date()
  const currentQuarter = Math.floor(now.getMonth() / 3)
  const quarterStart = new Date(now.getFullYear(), currentQuarter * 3, 1)
  const quarterEnd = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0)
  
  const q1Budget = await prisma.budget.create({
    data: {
      name: `Q${currentQuarter + 1} ${now.getFullYear()} Operations Budget`,
      amount: 945000, // Updated total for all categories
      currency: 'USD',
      period: 'QUARTERLY',
      category: 'Operations',
      boardId: board.id,
      startDate: quarterStart,
      endDate: quarterEnd,
      createdById: admin.id,
    },
  })

  console.log('✅ Created budget')

  // Create budget line items
  const budgetLines = await Promise.all([
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Water Well Drilling',
        type: 'CATEGORY',
        category: 'Water/Desal',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 200000,
        currency: 'USD',
        notes: 'Budget for drilling 4 new water wells',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Helium Procurement',
        type: 'CATEGORY',
        category: 'Helium',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 150000,
        currency: 'USD',
        notes: 'Helium gas purchases for Q1',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Equipment & Supplies',
        type: 'CATEGORY',
        category: 'Operations',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 100000,
        currency: 'USD',
        notes: 'General equipment and operational supplies',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Community Engagement',
        type: 'CATEGORY',
        category: 'Community',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 50000,
        currency: 'USD',
        notes: 'Community outreach and stakeholder engagement',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Legal & Compliance',
        type: 'CATEGORY',
        category: 'Finance/Legal',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 75000,
        currency: 'USD',
        notes: 'Legal fees, permits, and regulatory compliance',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Labor & Contractors',
        type: 'CATEGORY',
        category: 'Labor',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 180000,
        currency: 'USD',
        notes: 'Employee salaries and contractor payments',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Utilities & Facilities',
        type: 'CATEGORY',
        category: 'Utilities',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 45000,
        currency: 'USD',
        notes: 'Electricity, water, rent, and facility maintenance',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Marketing & Outreach',
        type: 'CATEGORY',
        category: 'Marketing',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 30000,
        currency: 'USD',
        notes: 'Marketing materials, advertising, and public relations',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Technology & Software',
        type: 'CATEGORY',
        category: 'Technology',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 25000,
        currency: 'USD',
        notes: 'Software licenses, IT infrastructure, and tech support',
      },
    }),
    prisma.budgetLineItem.create({
      data: {
        budgetId: q1Budget.id,
        name: 'Insurance & Risk Management',
        type: 'CATEGORY',
        category: 'Insurance',
        boardId: board.id,
        periodStart: quarterStart,
        periodEnd: quarterEnd,
        plannedAmount: 40000,
        currency: 'USD',
        notes: 'General liability, workers comp, and property insurance',
      },
    }),
  ])

  console.log('✅ Created budget line items')

  // Create sample expenses
  const expense1 = await prisma.expense.create({
    data: {
      amount: 45000,
      currency: 'USD',
      category: 'Water/Desal',
      description: 'Drilling services for Well Site A - Invoice #DR-2024-001',
      date: new Date(now.getFullYear(), now.getMonth(), 15),
      boardId: board.id,
      createdById: admin.id,
      aiVendorName: 'ABC Drilling Company',
      aiConfidence: 0.95,
      aiExtractedData: {
        invoiceNumber: 'DR-2024-001',
        subtotal: 42000,
        tax: 3000,
        total: 45000,
      },
    },
  })

  const expense2 = await prisma.expense.create({
    data: {
      amount: 28500,
      currency: 'USD',
      category: 'Helium',
      description: 'Helium gas delivery - October 2024',
      date: new Date(now.getFullYear(), now.getMonth(), 20),
      boardId: board.id,
      createdById: admin.id,
      aiVendorName: 'Helium Suppliers Inc',
      aiConfidence: 0.92,
      aiExtractedData: {
        quantity: '500 cubic meters',
        unitPrice: 57,
        subtotal: 28500,
        total: 28500,
      },
    },
  })

  console.log('✅ Created expenses')

  // Create expense line items
  await prisma.expenseLineItem.create({
    data: {
      expenseId: expense1.id,
      description: 'Drilling rig mobilization',
      quantity: 1,
      unitCost: 5000,
      totalAmount: 5000,
      category: 'Water/Desal',
    },
  })

  await prisma.expenseLineItem.create({
    data: {
      expenseId: expense1.id,
      description: 'Drilling operations (500ft depth)',
      quantity: 500,
      unitCost: 70,
      totalAmount: 35000,
      category: 'Water/Desal',
    },
  })

  await prisma.expenseLineItem.create({
    data: {
      expenseId: expense1.id,
      description: 'Well casing and materials',
      quantity: 1,
      unitCost: 2000,
      totalAmount: 2000,
      category: 'Water/Desal',
    },
  })

  await prisma.expenseLineItem.create({
    data: {
      expenseId: expense2.id,
      description: 'Helium gas (Grade A)',
      quantity: 500,
      unitCost: 57,
      totalAmount: 28500,
      category: 'Helium',
    },
  })

  console.log('✅ Created expense line items')

  // Create expense allocations
  await prisma.expenseAllocation.create({
    data: {
      budgetId: q1Budget.id,
      budgetLineItemId: budgetLines[0].id,
      expenseId: expense1.id,
      amount: 45000,
      currency: 'USD',
      notes: 'Allocated to Water Well Drilling budget line',
    },
  })

  await prisma.expenseAllocation.create({
    data: {
      budgetId: q1Budget.id,
      budgetLineItemId: budgetLines[1].id,
      expenseId: expense2.id,
      amount: 28500,
      currency: 'USD',
      notes: 'Allocated to Helium Procurement budget line',
    },
  })

  console.log('✅ Created expense allocations')

  // Create budget snapshots
  await prisma.budgetSnapshot.create({
    data: {
      budgetLineItemId: budgetLines[0].id,
      periodStart: quarterStart,
      periodEnd: quarterEnd,
      plannedAmount: 200000,
      actualAmount: 45000,
      variance: -155000,
      currency: 'USD',
    },
  })

  await prisma.budgetSnapshot.create({
    data: {
      budgetLineItemId: budgetLines[1].id,
      periodStart: quarterStart,
      periodEnd: quarterEnd,
      plannedAmount: 150000,
      actualAmount: 28500,
      variance: -121500,
      currency: 'USD',
    },
  })

  console.log('✅ Created budget snapshots')

  console.log('🎉 Seeding completed successfully!')
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
