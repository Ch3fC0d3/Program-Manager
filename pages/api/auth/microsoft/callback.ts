import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { exchangeCodeForTokens } from '@/lib/oneDrive'
import { prisma } from '@/lib/prisma'

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const session = await getSession({ req })
    if (!session?.user?.email) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { code, error } = req.query

    if (error) {
      return res.redirect('/dashboard?onedrive_error=' + encodeURIComponent(error as string))
    }

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Missing authorization code' })
    }

    // Exchange code for tokens
    const tokens = await exchangeCodeForTokens(code)

    // Store tokens in database
    await prisma.user.update({
      where: { email: session.user.email },
      data: {
        microsoftAccessToken: tokens.access_token || null,
        microsoftRefreshToken: tokens.refresh_token || null,
        microsoftTokenExpiry: tokens.expires_in ? new Date(Date.now() + tokens.expires_in * 1000) : null,
      },
    })

    // Redirect back to dashboard with success
    return res.redirect('/dashboard?onedrive_connected=true')
  } catch (err: any) {
    console.error('Microsoft OAuth callback error:', err)
    return res.redirect('/dashboard?onedrive_error=' + encodeURIComponent(err.message || 'Unknown error'))
  }
}
