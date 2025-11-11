// Database diagnostic script to check for Sweetwater Helium board and tasks
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function checkDatabase() {
  try {
    console.log('🔍 DATABASE DIAGNOSTIC REPORT\n')
    console.log('=' .repeat(60))

    // 1. Check all boards
    console.log('\n📋 ALL BOARDS IN DATABASE:')
    console.log('-'.repeat(60))
    const allBoards = await prisma.board.findMany({
      select: {
        id: true,
        name: true,
        archivedAt: true,
        deletedAt: true,
        createdAt: true,
        _count: {
          select: {
            tasks: true,
            members: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (allBoards.length === 0) {
      console.log('❌ NO BOARDS FOUND IN DATABASE')
    } else {
      allBoards.forEach((board, index) => {
        console.log(`\n${index + 1}. ${board.name}`)
        console.log(`   ID: ${board.id}`)
        console.log(`   Tasks: ${board._count.tasks}`)
        console.log(`   Members: ${board._count.members}`)
        console.log(`   Archived: ${board.archivedAt ? 'YES (' + board.archivedAt.toISOString() + ')' : 'NO'}`)
        console.log(`   Deleted: ${board.deletedAt ? 'YES (' + board.deletedAt.toISOString() + ')' : 'NO'}`)
        console.log(`   Created: ${board.createdAt.toISOString()}`)
      })
    }

    // 2. Search specifically for Sweetwater Helium
    console.log('\n\n🔎 SEARCHING FOR "SWEETWATER HELIUM":')
    console.log('-'.repeat(60))
    const sweetwaterBoards = await prisma.board.findMany({
      where: {
        OR: [
          { name: { contains: 'sweetwater', mode: 'insensitive' } },
          { name: { contains: 'helium', mode: 'insensitive' } },
        ]
      },
      include: {
        members: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        },
        _count: {
          select: { tasks: true }
        }
      }
    })

    if (sweetwaterBoards.length === 0) {
      console.log('❌ NO BOARDS FOUND WITH "SWEETWATER" OR "HELIUM"')
    } else {
      sweetwaterBoards.forEach(board => {
        console.log(`\n✅ FOUND: ${board.name}`)
        console.log(`   Board ID: ${board.id}`)
        console.log(`   Tasks: ${board._count.tasks}`)
        console.log(`   Archived: ${board.archivedAt ? 'YES' : 'NO'}`)
        console.log(`   Deleted: ${board.deletedAt ? 'YES' : 'NO'}`)
        console.log(`   Members (${board.members.length}):`)
        board.members.forEach(member => {
          console.log(`     - ${member.user.name} (${member.user.email}) - Role: ${member.role}`)
        })
      })
    }

    // 3. Check for the specific task ID from the error
    console.log('\n\n🔎 CHECKING SPECIFIC TASK ID:')
    console.log('-'.repeat(60))
    const taskId = 'cmhfc2ogj0005z3frim8885q8'
    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: {
        board: {
          select: { name: true }
        }
      }
    })

    if (task) {
      console.log(`✅ Task found: ${task.title}`)
      console.log(`   Board: ${task.board.name}`)
      console.log(`   Status: ${task.status}`)
    } else {
      console.log(`❌ Task ${taskId} NOT FOUND in database`)
    }

    // 4. Count total tasks
    console.log('\n\n📊 DATABASE STATISTICS:')
    console.log('-'.repeat(60))
    const totalTasks = await prisma.task.count()
    const totalBoards = await prisma.board.count()
    const totalUsers = await prisma.user.count()
    const archivedBoards = await prisma.board.count({
      where: { archivedAt: { not: null } }
    })

    console.log(`Total Boards: ${totalBoards}`)
    console.log(`Active Boards: ${totalBoards - archivedBoards}`)
    console.log(`Archived Boards: ${archivedBoards}`)
    console.log(`Total Tasks: ${totalTasks}`)
    console.log(`Total Users: ${totalUsers}`)

    // 5. Check recent activity
    console.log('\n\n📜 RECENT ACTIVITY (Last 10):')
    console.log('-'.repeat(60))
    const recentActivity = await prisma.activity.findMany({
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    })

    recentActivity.forEach((activity, index) => {
      console.log(`\n${index + 1}. [${activity.createdAt.toLocaleString()}]`)
      console.log(`   User: ${activity.user.name}`)
      console.log(`   Action: ${activity.action}`)
      if (activity.details) {
        console.log(`   Details: ${JSON.stringify(activity.details, null, 2)}`)
      }
    })

    console.log('\n' + '='.repeat(60))
    console.log('✅ DIAGNOSTIC COMPLETE\n')

  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkDatabase()
