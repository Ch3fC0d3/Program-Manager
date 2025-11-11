// Quick script to search for the Sweetwater Helium board
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function findBoard() {
  try {
    console.log('🔍 Searching for Sweetwater Helium board...\n')

    // Search for boards with "sweetwater" or "helium" in the name
    const boards = await prisma.board.findMany({
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
        }
      }
    })

    if (boards.length === 0) {
      console.log('❌ No boards found with "sweetwater" or "helium" in the name')
      console.log('\n📋 Checking all boards...\n')
      
      const allBoards = await prisma.board.findMany({
        select: {
          id: true,
          name: true,
          archivedAt: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' }
      })

      console.log(`Found ${allBoards.length} total boards:`)
      allBoards.forEach(board => {
        console.log(`  - ${board.name} (${board.archivedAt ? 'ARCHIVED' : 'ACTIVE'}) - Created: ${board.createdAt.toLocaleDateString()}`)
      })
    } else {
      console.log(`✅ Found ${boards.length} matching board(s):\n`)
      boards.forEach(board => {
        console.log(`📌 Board: ${board.name}`)
        console.log(`   ID: ${board.id}`)
        console.log(`   Status: ${board.archivedAt ? 'ARCHIVED' : 'ACTIVE'}`)
        console.log(`   Created: ${board.createdAt}`)
        console.log(`   Members: ${board.members.length}`)
        board.members.forEach(member => {
          console.log(`     - ${member.user.name} (${member.role})`)
        })
        console.log('')
      })
    }

    // Check recent activity for board deletions
    console.log('\n🔍 Checking recent activity logs...\n')
    const recentActivity = await prisma.activity.findMany({
      where: {
        OR: [
          { action: { contains: 'board', mode: 'insensitive' } },
          { action: { contains: 'delete', mode: 'insensitive' } },
        ]
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    })

    if (recentActivity.length > 0) {
      console.log('Recent board-related activities:')
      recentActivity.forEach(activity => {
        console.log(`  [${activity.createdAt.toLocaleString()}] ${activity.user.name}: ${activity.action}`)
        if (activity.details) {
          console.log(`    Details: ${JSON.stringify(activity.details)}`)
        }
      })
    }

  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

findBoard()
