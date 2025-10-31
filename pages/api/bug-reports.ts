import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from './auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'POST') {
    try {
      const { title, description, steps, severity, url, userAgent } = req.body

      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' })
      }

      // Store bug report in activity log
      const bugReport = await prisma.activity.create({
        data: {
          userId: session.user.id,
          action: 'bug_reported',
          details: {
            title,
            description,
            steps: steps || null,
            severity: severity || 'medium',
            url: url || null,
            userAgent: userAgent || null,
            reportedBy: session.user.name || session.user.email,
            reportedAt: new Date().toISOString()
          }
        }
      })

      console.log('🐛 Bug Report Submitted:', {
        id: bugReport.id,
        title,
        severity,
        user: session.user.email,
        url
      })

      return res.status(201).json({ success: true, id: bugReport.id })
    } catch (error) {
      console.error('Error creating bug report:', error)
      return res.status(500).json({ error: 'Failed to create bug report' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
