import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { sendEmail } from '@/lib/email'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const { to, subject, html, text } = req.body

    if (!to || !subject || !html) {
      return res.status(400).json({ error: 'Missing required fields: to, subject, html' })
    }

    const result = await sendEmail({
      to,
      subject,
      html,
      text,
    })

    if (result.success) {
      return res.status(200).json({ 
        success: true, 
        messageId: result.messageId 
      })
    } else {
      return res.status(500).json({ 
        error: 'Failed to send email',
        details: result.error 
      })
    }
  } catch (error: any) {
    console.error('Email API error:', error)
    return res.status(500).json({ 
      error: 'Failed to send email',
      details: error.message 
    })
  }
}
