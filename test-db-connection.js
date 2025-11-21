const { PrismaClient } = require('@prisma/client')

async function testDatabase(databaseUrl, name) {
  console.log(`\n=== Testing ${name} ===`)
  console.log(`URL: ${databaseUrl.replace(/:[^:@]+@/, ':****@')}`)
  
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl
      }
    }
  })

  try {
    // Test connection
    await prisma.$connect()
    console.log('✅ Connection successful')

    // Count users
    const userCount = await prisma.user.count()
    console.log(`👥 Users: ${userCount}`)

    // Get first few users (without passwords)
    const users = await prisma.user.findMany({
      take: 5,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    if (users.length > 0) {
      console.log('\n📋 Users found:')
      users.forEach(u => {
        console.log(`  - ${u.email} (${u.role}) - Created: ${u.createdAt.toISOString().split('T')[0]}`)
      })
    } else {
      console.log('⚠️  No users found')
    }

    // Count other important tables
    const boardCount = await prisma.board.count()
    const taskCount = await prisma.task.count()
    const expenseCount = await prisma.expense.count()
    
    console.log(`\n📊 Data summary:`)
    console.log(`  - Boards: ${boardCount}`)
    console.log(`  - Tasks: ${taskCount}`)
    console.log(`  - Expenses: ${expenseCount}`)

  } catch (error) {
    console.log('❌ Error:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

async function main() {
  console.log('🔍 Testing both Supabase databases...\n')

  // Test OLD database (iuwduqzamfjvgzlnndoh)
  const oldDb = 'postgresql://postgres:RedQueen12!!@db.iuwduqzamfjvgzlnndoh.supabase.co:5432/postgres'
  await testDatabase(oldDb, 'OLD Database (iuwduqzamfjvgzlnndoh)')

  // Test NEW database (fegstrmxiitzwldmrowm)
  const newDb = 'postgresql://postgres:RedQueen12!!@db.fegstrmxiitzwldmrowm.supabase.co:5432/postgres'
  await testDatabase(newDb, 'NEW Database (fegstrmxiitzwldmrowm)')

  console.log('\n✅ Test complete!')
}

main()
  .catch(console.error)
  .finally(() => process.exit(0))
