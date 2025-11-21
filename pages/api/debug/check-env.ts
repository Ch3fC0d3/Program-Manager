import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Public endpoint - no auth required
  // Show which database we're connected to (without exposing password)
  const dbUrl = process.env.DATABASE_URL || 'NOT SET'
  const supabaseUrl = process.env.SUPABASE_URL || 'NOT SET'
  const nextPublicSupabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT SET'
  
  // Extract just the host from DATABASE_URL
  const dbHost = dbUrl.match(/@([^:]+):/)?.[1] || 'UNKNOWN'
  
  // Set CORS headers to allow access
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET')
  
  return res.status(200).json({
    databaseHost: dbHost,
    supabaseUrl: supabaseUrl,
    nextPublicSupabaseUrl: nextPublicSupabaseUrl,
    isCorrectDatabase: dbHost.includes('fegstrmxiitzwldmrowm'),
    timestamp: new Date().toISOString(),
  })
}
