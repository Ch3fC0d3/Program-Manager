import { NextApiRequest, NextApiResponse } from 'next'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required' })
  }

  try {
    // Try to find the user
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        password: true,
        role: true,
      }
    })

    if (!user) {
      return res.status(200).json({
        success: false,
        reason: 'User not found',
        email: email,
        databaseConnected: true
      })
    }

    if (!user.password) {
      return res.status(200).json({
        success: false,
        reason: 'User has no password set',
        email: email,
        userId: user.id,
        databaseConnected: true
      })
    }

    // Test password comparison
    const isValid = await bcrypt.compare(password, user.password)

    return res.status(200).json({
      success: isValid,
      reason: isValid ? 'Password matches' : 'Password does not match',
      email: email,
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      passwordHashPrefix: user.password.substring(0, 10) + '...',
      databaseConnected: true
    })

  } catch (error: any) {
    return res.status(500).json({
      success: false,
      error: error.message,
      code: error.code,
      databaseConnected: false
    })
  } finally {
    await prisma.$disconnect()
  }
}
