import type { NextApiRequest, NextApiResponse } from 'next'
import { getSession } from 'next-auth/react'
import { exchangeCodeForTokens } from '@/lib/googleDriveOAuth'
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
      return res.redirect('/dashboard?drive_error=' + encodeURIComponent(error as string))
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
        googleAccessToken: tokens.access_token || null,
        googleRefreshToken: tokens.refresh_token || null,
        googleTokenExpiry: tokens.expiry_date ? new Date(tokens.expiry_date) : null,
      },
    })

    // Redirect back to dashboard with success
    return res.redirect('/dashboard?drive_connected=true')
  } catch (err: any) {
    console.error('Google OAuth callback error:', err)
    return res.redirect('/dashboard?drive_error=' + encodeURIComponent(err.message || 'Unknown error'))
  }
}
