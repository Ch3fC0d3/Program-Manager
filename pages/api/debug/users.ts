import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    // Get all users (without passwords for security)
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    })

    return res.status(200).json({
      success: true,
      count: users.length,
      users,
    })
  } catch (error: any) {
    console.error('Database error:', error)
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
    })
  } finally {
    await prisma.$disconnect()
  }
}
