import { NextApiRequest, NextApiResponse } from 'next'
import { listFiles } from '@/lib/supabaseStorage'

/**
 * Debug endpoint to test file listing without auth
 * Access: GET /api/debug/test-files
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const files = await listFiles()
    return res.status(200).json({
      success: true,
      fileCount: files.length,
      files
    })
  } catch (error: any) {
    console.error('Error listing files:', error)
    return res.status(500).json({ 
      error: 'Failed to list files',
      details: error.message || String(error)
    })
  }
}
