import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { getAuthUrl } from '@/lib/oneDrive'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const session = await getSession({ req })
  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  if (req.method === 'GET') {
    // Initiate OAuth flow
    try {
      const authUrl = getAuthUrl()
      return res.json({ authUrl })
    } catch (err: any) {
      console.error('Error generating auth URL:', err)
      return res.status(500).json({ error: err.message || 'Failed to generate auth URL' })
    }
  }

  if (req.method === 'DELETE') {
    // Disconnect OneDrive
    try {
      await prisma.user.update({
        where: { email: session.user.email },
        data: {
          microsoftAccessToken: null,
          microsoftRefreshToken: null,
          microsoftTokenExpiry: null,
        },
      })
      return res.json({ success: true })
    } catch (err: any) {
      console.error('Error disconnecting OneDrive:', err)
      return res.status(500).json({ error: err.message || 'Failed to disconnect' })
    }
  }

  res.setHeader('Allow', 'GET,DELETE')
  return res.status(405).json({ error: 'Method not allowed' })
}
