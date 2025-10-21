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
