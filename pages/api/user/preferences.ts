import { NextApiRequest, NextApiResponse } from 'next'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '../auth/[...nextauth]'
import { prisma } from '@/lib/prisma'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions)

  if (!session?.user?.email) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  const user = await prisma.user.findUnique({
    where: { email: session.user.email },
    select: { id: true, theme: true, sidebarCollapsed: true }
  })

  if (!user) {
    return res.status(404).json({ error: 'User not found' })
  }

  if (req.method === 'GET') {
    return res.status(200).json({
      theme: user.theme || 'light',
      sidebarCollapsed: user.sidebarCollapsed || false
    })
  }

  if (req.method === 'PATCH') {
    try {
      const { theme, sidebarCollapsed } = req.body

      const updates: any = {}
      
      if (theme !== undefined && ['light', 'dark', 'disco'].includes(theme)) {
        updates.theme = theme
      }
      
      if (sidebarCollapsed !== undefined && typeof sidebarCollapsed === 'boolean') {
        updates.sidebarCollapsed = sidebarCollapsed
      }

      const updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: updates,
        select: { theme: true, sidebarCollapsed: true }
      })

      return res.status(200).json(updatedUser)
    } catch (error) {
      console.error('Error updating preferences:', error)
      return res.status(500).json({ error: 'Failed to update preferences' })
    }
  }

  return res.status(405).json({ error: 'Method not allowed' })
}
