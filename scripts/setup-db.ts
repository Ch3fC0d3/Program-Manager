import { execSync } from 'child_process'
import fs from 'fs'
import path from 'path'

const projectRoot = path.resolve(__dirname, '..')
const envPath = path.join(projectRoot, '.env')
const envExamplePath = path.join(projectRoot, '.env.example')
const uploadDir = path.join(projectRoot, 'public', 'uploads')

function run(command: string) {
  console.log(`\n▶ Running: ${command}`)
  execSync(command, { stdio: 'inherit', cwd: projectRoot })
}

async function main() {
  console.log('🔧 Starting database setup...')

  if (!fs.existsSync(envPath)) {
    if (fs.existsSync(envExamplePath)) {
      fs.copyFileSync(envExamplePath, envPath)
      console.log('📄 Created .env from .env.example. Please review and update connection details.')
    } else {
      console.warn('⚠️ No .env file found. Please create one before running database commands.')
      return
    }
  }

  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true })
    console.log('📂 Created uploads directory at public/uploads')
  }

  run('npx prisma migrate deploy')
  run('npx prisma db seed')

  console.log('\n✅ Database setup complete!')
}

main().catch((error) => {
  console.error('❌ Database setup failed:', error)
  process.exit(1)
})
