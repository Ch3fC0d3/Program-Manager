import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // GET - List all users
  if (req.method === 'GET') {
    try {
      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true,
          _count: {
            select: {
              tasksCreated: true,
              tasksAssigned: true,
              boards: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })

      return res.status(200).json(users)
    } catch (error) {
      console.error('Error fetching users:', error)
      return res.status(500).json({ error: 'Failed to fetch users' })
    }
  }

  // POST - Create new user
  if (req.method === 'POST') {
    try {
      // RBAC: Only ADMIN users can create new users
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })

      if (currentUser?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required to create users' })
      }

      const { name, email, password } = req.body

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' })
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { email }
      })

      if (existingUser) {
        return res.status(400).json({ error: 'User with this email already exists' })
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10)

      // Create user
      const newUser = await prisma.user.create({
        data: {
          name,
          email,
          password: hashedPassword
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          createdAt: true
        }
      })

      // Log the activity
      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'user_created',
          details: {
            createdUserId: newUser.id,
            createdUserName: newUser.name,
            createdUserEmail: newUser.email,
            createdBy: session.user.name
          }
        }
      })

      return res.status(201).json(newUser)
    } catch (error) {
      console.error('Error creating user:', error)
      return res.status(500).json({ error: 'Failed to create user' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
