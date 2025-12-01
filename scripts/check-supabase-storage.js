/**
 * Diagnostic script to list all Supabase storage buckets and their files
 * Run with: node -r dotenv/config scripts/check-supabase-storage.js dotenv_config_path=.env.local
 * Or manually set env vars: SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/check-supabase-storage.js
 */

const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables!')
  console.error('SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.error('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? '✓ Set' : '✗ Missing')
  process.exit(1)
}

console.log('✓ Supabase URL:', supabaseUrl)
console.log('✓ Service key found\n')

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkStorage() {
  try {
    // List all buckets
    console.log('📦 Fetching all storage buckets...\n')
    const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()
    
    if (bucketsError) {
      console.error('❌ Error listing buckets:', bucketsError)
      return
    }

    if (!buckets || buckets.length === 0) {
      console.log('⚠️  No buckets found in this Supabase project')
      console.log('\nTo create the "important-files" bucket, run:')
      console.log('  curl http://localhost:3000/api/setup/storage')
      return
    }

    console.log(`Found ${buckets.length} bucket(s):\n`)
    
    for (const bucket of buckets) {
      console.log(`\n${'='.repeat(60)}`)
      console.log(`📁 Bucket: "${bucket.name}"`)
      console.log(`   ID: ${bucket.id}`)
      console.log(`   Public: ${bucket.public ? 'Yes' : 'No'}`)
      console.log(`   Created: ${bucket.created_at}`)
      console.log(`${'='.repeat(60)}`)
      
      // List files in this bucket
      const { data: files, error: filesError } = await supabase.storage
        .from(bucket.name)
        .list('', {
          limit: 100,
          sortBy: { column: 'created_at', order: 'desc' }
        })
      
      if (filesError) {
        console.log(`   ❌ Error listing files: ${filesError.message}`)
        continue
      }
      
      if (!files || files.length === 0) {
        console.log('   📄 No files in this bucket')
        continue
      }
      
      console.log(`   📄 Files (${files.length}):\n`)
      files.forEach((file, idx) => {
        const size = file.metadata?.size 
          ? `${(file.metadata.size / 1024).toFixed(1)} KB`
          : 'Unknown size'
        console.log(`   ${idx + 1}. ${file.name}`)
        console.log(`      Size: ${size}`)
        console.log(`      Type: ${file.metadata?.mimetype || 'Unknown'}`)
        console.log(`      Created: ${file.created_at}`)
        console.log()
      })
    }

    // Check if 'important-files' bucket exists
    console.log('\n' + '='.repeat(60))
    const hasImportantFiles = buckets.some(b => b.name === 'important-files')
    if (hasImportantFiles) {
      console.log('✅ Bucket "important-files" EXISTS - your app should work!')
    } else {
      console.log('⚠️  Bucket "important-files" NOT FOUND')
      console.log('\nYour app expects a bucket named "important-files"')
      console.log('Available buckets:', buckets.map(b => `"${b.name}"`).join(', '))
      console.log('\nOptions:')
      console.log('1. Create "important-files" bucket via Supabase dashboard')
      console.log('2. Or run: curl http://localhost:3000/api/setup/storage')
      console.log('3. Or update lib/supabaseStorage.ts to use an existing bucket name')
    }
    console.log('='.repeat(60))

  } catch (error) {
    console.error('❌ Unexpected error:', error)
  }
}

checkStorage()
