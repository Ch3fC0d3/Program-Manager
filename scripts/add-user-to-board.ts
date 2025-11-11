// Script to add Gabriel Pellegrini to the Water & Helium Operations board
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function addUserToBoard() {
  try {
    console.log('🔧 Adding Gabriel Pellegrini to Water & Helium Operations board...\n')

    // Find Gabriel's user account
    const gabriel = await prisma.user.findUnique({
      where: { email: 'gabriel@pellegrini.us' },
      select: { id: true, name: true, email: true }
    })

    if (!gabriel) {
      console.log('❌ User gabriel@pellegrini.us not found')
      return
    }

    console.log(`✅ Found user: ${gabriel.name} (${gabriel.email})`)
    console.log(`   User ID: ${gabriel.id}\n`)

    // Find the Water & Helium Operations board
    const boardId = 'cmh5g1s250003na7ssuyq1wpf'
    const board = await prisma.board.findUnique({
      where: { id: boardId },
      select: { 
        id: true, 
        name: true,
        members: {
          include: {
            user: {
              select: { name: true, email: true }
            }
          }
        }
      }
    })

    if (!board) {
      console.log('❌ Board not found')
      return
    }

    console.log(`✅ Found board: ${board.name}`)
    console.log(`   Board ID: ${board.id}`)
    console.log(`   Current members: ${board.members.length}\n`)

    // Check if Gabriel is already a member
    const existingMember = board.members.find(m => m.user.email === gabriel.email)
    if (existingMember) {
      console.log(`⚠️  ${gabriel.name} is already a member of this board (Role: ${existingMember.role})`)
      return
    }

    // Add Gabriel as a member
    const newMember = await prisma.boardMember.create({
      data: {
        boardId: board.id,
        userId: gabriel.id,
        role: 'MEMBER'
      },
      include: {
        user: {
          select: { name: true, email: true }
        }
      }
    })

    console.log(`✅ SUCCESS! Added ${newMember.user.name} to "${board.name}"`)
    console.log(`   Role: ${newMember.role}`)
    console.log(`\n🎉 Gabriel can now see the board at /boards/${board.id}`)

  } catch (error) {
    console.error('❌ ERROR:', error)
  } finally {
    await prisma.$disconnect()
  }
}

addUserToBoard()
