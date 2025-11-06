import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Use service role key for server-side operations
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

const BUCKET_NAME = 'important-files'

// Ensure bucket exists (call this once during setup)
export async function ensureBucket() {
  const { data: buckets } = await supabaseAdmin.storage.listBuckets()
  const bucketExists = buckets?.some(b => b.name === BUCKET_NAME)
  
  if (!bucketExists) {
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: false,
      fileSizeLimit: 52428800, // 50MB
    })
  }
}

export async function listFiles() {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .list('', {
      limit: 100,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) throw error

  return (data || []).map(file => ({
    id: file.id,
    name: file.name,
    size: file.metadata?.size?.toString() || '0',
    mimeType: file.metadata?.mimetype || 'application/octet-stream',
    modifiedTime: file.created_at,
    webViewLink: getPublicUrl(file.name),
  }))
}

export async function uploadFile(
  fileName: string,
  buffer: Buffer,
  mimeType: string
) {
  // Generate unique filename to avoid conflicts
  const timestamp = Date.now()
  const uniqueFileName = `${timestamp}-${fileName}`

  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .upload(uniqueFileName, buffer, {
      contentType: mimeType,
      upsert: false,
    })

  if (error) throw error

  return {
    id: data.path,
    name: fileName,
    size: buffer.length.toString(),
    mimeType,
    modifiedTime: new Date().toISOString(),
    webViewLink: getPublicUrl(data.path),
  }
}

export async function deleteFile(filePath: string) {
  const { error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .remove([filePath])

  if (error) throw error
}

export async function downloadFile(filePath: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .download(filePath)

  if (error) throw error
  return data
}

export function getPublicUrl(filePath: string) {
  const { data } = supabaseAdmin.storage
    .from(BUCKET_NAME)
    .getPublicUrl(filePath)
  
  return data.publicUrl
}

// Get signed URL for private files (expires in 1 hour)
export async function getSignedUrl(filePath: string) {
  const { data, error } = await supabaseAdmin.storage
    .from(BUCKET_NAME)
    .createSignedUrl(filePath, 3600)

  if (error) throw error
  return data.signedUrl
}
