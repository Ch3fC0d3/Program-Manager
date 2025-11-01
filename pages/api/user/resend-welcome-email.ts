import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'
import { sendEmail, emailTemplates } from '@/lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const currentUser = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, name: true, role: true }
  })

  if (!currentUser) {
    return res.status(404).json({ error: 'User not found' })
  }

  try {
    const { userId } = req.body

    // If userId is provided, admin is sending to another user
    // If not provided, user is sending to themselves
    const targetUserId = userId || currentUser.id

    // Check permissions: admins can send to anyone, users can only send to themselves
    if (targetUserId !== currentUser.id && currentUser.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Only admins can send welcome emails to other users' })
    }

    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        email: true,
        name: true
      }
    })

    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' })
    }

    // Prepare email data
    const loginUrl = `${process.env.NEXTAUTH_URL}/login`
    const appUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'
    
    const emailTemplate = emailTemplates.welcomeEmail({
      userName: targetUser.name,
      userEmail: targetUser.email,
      loginUrl,
      appUrl,
      createdBy: currentUser.name
    })

    // Send email
    const result = await sendEmail({
      to: targetUser.email,
      subject: emailTemplate.subject,
      html: emailTemplate.html,
      text: emailTemplate.text
    })

    if (!result.success) {
      console.error('Failed to send welcome email:', result.error)
      return res.status(500).json({ error: 'Failed to send email' })
    }

    return res.status(200).json({ 
      success: true, 
      message: `Welcome email sent to ${targetUser.email}` 
    })
  } catch (error) {
    console.error('Error resending welcome email:', error)
    return res.status(500).json({ error: 'Failed to resend welcome email' })
  }
}
