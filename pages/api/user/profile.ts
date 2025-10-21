import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    try {
      const user = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true,
        },
      })

      if (!user) {
        return res.status(404).json({ error: 'User not found' })
      }

      return res.status(200).json(user)
    } catch (error) {
      console.error('Error fetching user profile:', error)
      return res.status(500).json({ error: 'Failed to fetch profile' })
    }
  }

  if (req.method === 'PUT') {
    try {
      const { name, email, avatar } = req.body

      // Check if email is already taken by another user
      if (email && email !== session.user.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email },
        })

        if (existingUser && existingUser.id !== session.user.id) {
          return res.status(400).json({ error: 'Email already in use' })
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: session.user.id },
        data: {
          ...(name && { name }),
          ...(email && { email }),
          ...(avatar !== undefined && { avatar }),
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
        },
      })

      return res.status(200).json(updatedUser)
    } catch (error) {
      console.error('Error updating user profile:', error)
      return res.status(500).json({ error: 'Failed to update profile' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
