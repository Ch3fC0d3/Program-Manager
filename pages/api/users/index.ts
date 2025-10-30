import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { sendEmail, emailTemplates } from '@/lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`📨 ${req.method} /api/users`)
  
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    console.log('❌ Unauthorized request to /api/users')
    return res.status(401).json({ error: 'Unauthorized' })
  }
  
  console.log(`✅ Authenticated user: ${session.user.email}`)

  // GET - List all users
  if (req.method === 'GET') {
    try {
      // RBAC: Only ADMIN users can view user directory
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })

      if (currentUser?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required to view users' })
      }

      const users = await prisma.user.findMany({
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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

      const { name, email, password, role } = req.body

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required' })
      }

      const allowedRoles = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const
      const roleToAssign = allowedRoles.includes(role) ? role : 'MEMBER'

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
          password: hashedPassword,
          role: roleToAssign
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
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

      // Send welcome email to new user
      const appUrl = process.env.NEXTAUTH_URL || 'https://program-manager-iota.vercel.app'
      const creatorName = session.user.name || session.user.email || 'Your administrator'
      
      console.log('📧 Preparing to send welcome email to:', newUser.email)
      console.log('🔗 Login URL:', `${appUrl}/login`)
      
      const emailTemplate = emailTemplates.welcomeEmail({
        userName: newUser.name || newUser.email,
        userEmail: newUser.email,
        temporaryPassword: password, // Send the password they were created with
        loginUrl: `${appUrl}/login`,
        appUrl,
        createdBy: creatorName
      })

      // Send email asynchronously (don't block the response)
      sendEmail({
        to: newUser.email,
        subject: emailTemplate.subject,
        html: emailTemplate.html,
        text: emailTemplate.text
      }).then(result => {
        if (result.success) {
          console.log('✅ Welcome email sent successfully to:', newUser.email, 'MessageID:', result.messageId)
        } else {
          console.error('❌ Failed to send welcome email to:', newUser.email, 'Error:', result.error)
        }
      }).catch(error => {
        console.error('❌ Exception sending welcome email to:', newUser.email, error)
        // Don't fail the request if email fails
      })

      return res.status(201).json(newUser)
    } catch (error) {
      console.error('Error creating user:', error)
      return res.status(500).json({ error: 'Failed to create user' })
    }
  }

  // PATCH - Update user role
  if (req.method === 'PATCH') {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })

      if (currentUser?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required to update users' })
      }

      const { userId, role } = req.body as { userId?: string; role?: string }

      if (!userId || typeof userId !== 'string') {
        return res.status(400).json({ error: 'User ID is required' })
      }

      const allowedRoles = ['ADMIN', 'MANAGER', 'MEMBER', 'VIEWER'] as const
      if (!role || !allowedRoles.includes(role as typeof allowedRoles[number])) {
        return res.status(400).json({ error: 'Invalid role supplied' })
      }

      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true }
      })

      if (!targetUser) {
        return res.status(404).json({ error: 'User not found' })
      }

      if (targetUser.role === 'ADMIN' && role !== 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot remove the last admin from the system' })
        }
      }

      const updatedUser = await prisma.user.update({
        where: { id: userId },
        data: { role: role as typeof allowedRoles[number] },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
          avatar: true,
          createdAt: true
        }
      })

      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'user_role_updated',
          details: {
            updatedUserId: updatedUser.id,
            updatedUserName: updatedUser.name,
            updatedUserEmail: updatedUser.email,
            newRole: updatedUser.role,
            updatedBy: session.user.name
          }
        }
      })

      return res.status(200).json(updatedUser)
    } catch (error) {
      console.error('Error updating user role:', error)
      return res.status(500).json({ error: 'Failed to update user role' })
    }
  }

  // DELETE - Remove user
  if (req.method === 'DELETE') {
    try {
      const currentUser = await prisma.user.findUnique({
        where: { id: session.user.id },
        select: { role: true }
      })

      if (currentUser?.role !== 'ADMIN') {
        return res.status(403).json({ error: 'Admin access required to delete users' })
      }

      const { userId } = req.body as { userId?: string }

      console.log('🗑️ Delete user request - userId:', userId, 'type:', typeof userId)

      if (!userId || typeof userId !== 'string') {
        console.error('❌ Invalid userId:', userId)
        return res.status(400).json({ error: 'User ID is required' })
      }

      if (userId === session.user.id) {
        return res.status(400).json({ error: 'Admins cannot delete their own account' })
      }

      console.log('🔍 Looking for user with ID:', userId)
      const targetUser = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, name: true, email: true, role: true }
      })

      console.log('👤 Found user:', targetUser ? `${targetUser.name} (${targetUser.email})` : 'NOT FOUND')

      if (!targetUser) {
        console.error('❌ User not found in database with ID:', userId)
        return res.status(404).json({ error: 'User not found' })
      }

      if (targetUser.role === 'ADMIN') {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } })
        if (adminCount <= 1) {
          return res.status(400).json({ error: 'Cannot delete the last admin from the system' })
        }
      }

      console.log('🗑️ Deleting user:', targetUser.email)
      await prisma.user.delete({ where: { id: userId } })

      await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'user_deleted',
          details: {
            deletedUserId: targetUser.id,
            deletedUserName: targetUser.name,
            deletedUserEmail: targetUser.email,
            deletedBy: session.user.name
          }
        }
      })

      console.log('✅ User deleted successfully:', targetUser.email)
      return res.status(200).json({ success: true })
    } catch (error) {
      console.error('❌ Error deleting user:', error)
      return res.status(500).json({ error: 'Failed to delete user. Ensure the user has no remaining ownership records.' })
    }
  }

  console.log(`❌ Method ${req.method} not allowed on /api/users`)
  return res.status(405).json({ error: `Method ${req.method} not allowed` })
}
