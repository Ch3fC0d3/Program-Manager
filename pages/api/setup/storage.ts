import { NextApiRequest, NextApiResponse } from 'next'
import { ensureBucket } from '@/lib/supabaseStorage'

/**
 * One-time setup endpoint to create the Supabase storage bucket
 * Call this once after deployment: GET /api/setup/storage
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    await ensureBucket()
    return res.status(200).json({ 
      success: true, 
      message: 'Storage bucket ensured successfully' 
    })
  } catch (error: any) {
    console.error('Error ensuring bucket:', error)
    return res.status(500).json({ 
      error: 'Failed to ensure bucket',
      details: error.message || String(error)
    })
  }
}
