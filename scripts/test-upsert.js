const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient()

async function main() {
  const email = `tempuser_${Date.now()}@example.com`
  try {
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        name: 'Temp User'
      },
      create: {
        email,
        name: 'Temp User'
      }
    })
    console.log('user created', user)
  } catch (error) {
    console.error('error', error)
  } finally {
    await prisma.$disconnect()
  }
}

main()
