# Supabase Setup Guide

Quick guide to set up your PostgreSQL database with Supabase (free tier), plus the additional steps for organizations, watchers, and CSV imports.

## Step 1: Create Supabase Account

1. Go to [supabase.com](https://supabase.com)
2. Click **Start your project**
3. Sign up with GitHub, Google, or email

## Step 2: Create New Project

1. Click **New Project**
2. Fill in:
   - **Name**: `project-management` (or any name you like)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to you
   - **Pricing Plan**: Free
3. Click **Create new project**
4. Wait 2-3 minutes for setup to complete

## Step 3: Get Connection Strings (You need TWO)

1. In your Supabase dashboard, go to **Settings** (gear icon in sidebar)
2. Click **Database** in the left menu
3. Scroll down to **Connection string** section
4. Select **URI** tab

### Get Pooled URL (for app queries):
5. Toggle **"Use connection pooling"** to **ON**
6. Copy the connection string - this is your `DATABASE_URL`
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres?pgbouncer=true
   ```

### Get Direct URL (for migrations):
7. Toggle **"Use connection pooling"** to **OFF**
8. Copy the connection string - this is your `DIRECT_URL`
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres
   ```

9. **Important**: Replace `[YOUR-PASSWORD]` with the database password you created in Step 2

## Step 4: Update Your .env File

1. In your project folder, create a `.env` file (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```

2. Open `.env` and add BOTH connection strings:
   ```env
   # Pooled connection (for app)
   DATABASE_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"
   
   # Direct connection (for migrations)
   DIRECT_URL="postgresql://postgres:YOUR_ACTUAL_PASSWORD@db.xxxxxxxxxxxxxxxxxxxx.supabase.co:5432/postgres"
   ```

3. Generate a secure NextAuth secret:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```
   Copy the output and paste it as `NEXTAUTH_SECRET` in your `.env`

4. Add optional configuration for Supabase Auth or CSV imports when needed:
   ```env
   # Supabase Auth (optional if switching auth providers)
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
   ```

## Step 5: Prepare Database Schema

Run the database setup script:

```bash
npm run db:setup
```

This will:
- Create all tables
- Set up relationships (including organizations, watchers, time entries, custom fields)
- Seed demo data

If you already have the schema and only need to apply the latest changes run:

```bash
npx prisma migrate dev --name extend_productivity_models
npx prisma generate
```

## Step 6: Start the App

```bash
npm run dev
```

Or use the batch file:
```bash
scripts\start-app.bat
```

## Verify Setup & Org Structure

1. Open `http://localhost:3000`
2. Login with:
   - Email: `admin@example.com`
   - Password: `admin123`
3. You should see the dashboard with demo data
4. Navigate to the new `Vendors` page (`/vendors`) to verify the vendor board was created automatically
5. Check `Boards` → your board to ensure organization membership shows up

## Troubleshooting

### Connection Error
- Double-check your password in the connection string
- Make sure you replaced `[YOUR-PASSWORD]` with actual password
- Try the direct connection string (without pooling) from `.env.example`

### Migration Errors
- Make sure Supabase project is fully initialized (wait 2-3 minutes after creation)
- Check that your IP isn't blocked (Supabase allows all IPs by default)
- Ensure both `DATABASE_URL` and `DIRECT_URL` are present in `.env`
- If you see `prepared statement already exists`, re-run with `DIRECT_URL` (no connection pooling)

### Can't Find Connection String
- Go to Supabase Dashboard → Settings → Database
- Look for "Connection string" section
- Make sure "Use connection pooling" is toggled ON

## Your .env Should Look Like This (Example)

```env
# Database - Supabase
DATABASE_URL="postgresql://postgres.abcdefghijklmnopqrst:MySecurePassword123!@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1"

# Direct connection for migrations
DIRECT_URL="postgresql://postgres.abcdefghijklmnopqrst:MySecurePassword123!@aws-0-us-east-1.supabase.com:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="a8f3j2k9d0s1m4n7b6v5c8x2z1q3w4e5r6t7y8u9i0o1p2"

# File Upload
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=10485760

# Optional Supabase Auth / CSV keys
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"
```

## Next Steps

Once everything is working:
1. Explore the demo board and tasks
2. Create your own boards
3. Invite team members (create user accounts)
4. Customize labels for your workstreams
5. Use CSV import dialogs on `/boards/[id]`, `/contacts`, and `/vendors` to import real data
6. Set notification preferences per user after the data load

---

**Need help?** Check the main [README.md](README.md) or [SETUP.md](SETUP.md)
