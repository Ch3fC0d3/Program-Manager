import { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

/**
 * Debug endpoint to list all Supabase storage buckets and their files
 * Access: GET /api/debug/list-buckets
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({
      error: 'Missing Supabase credentials',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseServiceKey
    })
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    // List all buckets
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      return res.status(500).json({ 
        error: 'Failed to list buckets',
        details: bucketsError 
      })
    }

    if (!buckets || buckets.length === 0) {
      return res.status(200).json({
        message: 'No buckets found',
        buckets: [],
        recommendation: 'Create "important-files" bucket via Supabase dashboard or call /api/setup/storage'
      })
    }

    // Get files from each bucket
    const bucketsWithFiles = await Promise.all(
      buckets.map(async (bucket) => {
        const { data: files, error: filesError } = await supabase.storage
          .from(bucket.name)
          .list('', {
            limit: 100,
            sortBy: { column: 'created_at', order: 'desc' }
          })
        
        return {
          name: bucket.name,
          id: bucket.id,
          public: bucket.public,
          created_at: bucket.created_at,
          fileCount: files?.length || 0,
          files: files?.map(f => ({
            name: f.name,
            size: f.metadata?.size || 0,
            sizeFormatted: f.metadata?.size 
              ? `${(f.metadata.size / 1024).toFixed(1)} KB`
              : 'Unknown',
            mimeType: f.metadata?.mimetype || 'Unknown',
            created_at: f.created_at
          })) || [],
          error: filesError?.message
        }
      })
    )

    const hasImportantFiles = buckets.some(b => b.name === 'important-files')

    return res.status(200).json({
      supabaseUrl,
      totalBuckets: buckets.length,
      buckets: bucketsWithFiles,
      hasImportantFilesBucket: hasImportantFiles,
      recommendation: hasImportantFiles
        ? 'Bucket "important-files" exists - your app should work!'
        : `Bucket "important-files" not found. Available: ${buckets.map(b => b.name).join(', ')}. Create it or update lib/supabaseStorage.ts`
    })

  } catch (error: any) {
    return res.status(500).json({ 
      error: 'Unexpected error',
      details: error.message || String(error)
    })
  }
}
