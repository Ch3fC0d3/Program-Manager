import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Only admins can reset passwords
  if (session.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Forbidden - Admin access required' })
  }

  const { userId, newPassword } = req.body

  if (!userId || !newPassword) {
    return res.status(400).json({ error: 'User ID and new password are required' })
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true }
    })

    if (!user) {
      return res.status(404).json({ error: 'User not found' })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update the user's password
    await prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword }
    })

    // Log the activity
    await prisma.activity.create({
      data: {
        userId: session.user.id,
        action: 'PASSWORD_RESET',
        details: `Admin reset password for user: ${user.email}`,
      }
    })

    return res.status(200).json({ 
      success: true, 
      message: `Password reset successfully for ${user.name || user.email}` 
    })
  } catch (error) {
    console.error('Error resetting password:', error)
    return res.status(500).json({ error: 'Failed to reset password' })
  }
}
