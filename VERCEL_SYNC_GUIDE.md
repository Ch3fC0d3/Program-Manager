# Vercel Environment Sync Guide

This guide helps you verify that your local environment matches your Vercel production environment.

## Step 1: Check Vercel Environment Variables

### In Vercel Dashboard:
1. Go to https://vercel.com/dashboard
2. Select your project: `program-manager`
3. Go to **Settings** → **Environment Variables**
4. Check the following variables for **Production** environment:

#### Required Variables:
- `DATABASE_URL` - Supabase pooled connection string
- `DIRECT_URL` - Supabase direct connection string
- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_ANON_KEY` - Supabase anonymous key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key
- `NEXTAUTH_URL` - Your production URL (e.g., https://program-manager-iota.vercel.app)
- `NEXTAUTH_SECRET` - Secret for NextAuth
- `OPENAI_API_KEY` - OpenAI API key (if using AI features)
- `HUGGINGFACE_API_KEY` - Hugging Face API key (if using AI features)
- Email configuration (Maileroo):
  - `MAILEROO_SMTP_HOST`
  - `MAILEROO_SMTP_PORT`
  - `MAILEROO_SMTP_USER`
  - `MAILEROO_SMTP_PASSWORD`
  - `EMAIL_FROM`

### Expected Values:
Your Supabase project should be: `fegstrmxiitzwldmrowm.supabase.co`

**DATABASE_URL** should look like:
```
postgresql://postgres.xxxxx:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:5432/postgres
```

**DIRECT_URL** should look like:
```
postgresql://postgres:[PASSWORD]@db.fegstrmxiitzwldmrowm.supabase.co:5432/postgres
```

**SUPABASE_URL** should be:
```
https://fegstrmxiitzwldmrowm.supabase.co
```

## Step 2: Compare with Local .env.local

Open your local `.env.local` file and compare each variable:

```bash
# View your local environment variables (passwords masked)
npm run db:verify
```

This will show your current database connection info with passwords masked.

### Manual Comparison Checklist:
- [ ] DATABASE_URL points to the same Supabase project
- [ ] DIRECT_URL points to the same Supabase project
- [ ] SUPABASE_URL matches exactly
- [ ] SUPABASE_ANON_KEY matches
- [ ] SUPABASE_SERVICE_ROLE_KEY matches
- [ ] NEXTAUTH_SECRET is set (different for local vs production is OK)
- [ ] NEXTAUTH_URL is correct for each environment

## Step 3: Verify Database Connection

Run the database verification script:

```bash
npm run db:verify
```

This will check:
- ✅ Database connection is working
- ✅ Users exist
- ✅ Boards exist
- ✅ Tasks exist (should have at least 5 demo tasks)
- ✅ All other entities

### Expected Output:
```
✅ Database connection successful
   Found 3 users:
   - admin@example.com (ADMIN)
   - john@example.com (MANAGER)
   - jane@example.com (MEMBER)

   Found 1 boards:
   - Water & Helium Operations (5 tasks, 3 members)

   Total tasks: 5
```

### If No Tasks Found:
If you see "⚠️ WARNING: No tasks found in database!", run:

```bash
npm run db:setup
```

This will seed the database with demo data.

## Step 4: Clear Browser Cache Issues

If your site works in incognito but not in regular browser, you have a cache issue.

### Option A: Use the Cache Clearing Endpoint
Visit this URL in your browser:
```
https://program-manager-iota.vercel.app/api/debug/clear-cache
```

Or locally:
```
http://localhost:3000/api/debug/clear-cache
```

This will:
- Clear localStorage
- Clear sessionStorage
- Unregister all service workers
- Delete all browser caches
- Redirect you to login

### Option B: Manual Browser Cache Clear

#### Chrome/Edge:
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select **All time**
3. Check:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
4. Click **Clear data**

#### Additional: Clear Service Worker
1. Open DevTools (`F12`)
2. Go to **Application** tab
3. Click **Service Workers** in left sidebar
4. Click **Unregister** for all service workers
5. Click **Clear storage** in left sidebar
6. Click **Clear site data**

## Step 5: Verify Production Deployment

### Check Current Production Deployment:
1. Go to Vercel Dashboard → Your Project → Deployments
2. Find the deployment with **Production** badge
3. Note the **Git Commit SHA** (e.g., `6c81c6b`)
4. Note the **Created Date**

### Check Your Local Git Commit:
```bash
git log --oneline -1
```

### If Commits Don't Match:
Your local code might be ahead or behind production. To sync:

#### Option 1: Update Production to Match Local
```bash
# Make sure all changes are committed
git add .
git commit -m "Your commit message"
git push origin main
```

Vercel will automatically deploy the latest commit.

#### Option 2: Update Local to Match Production
```bash
# Find the production commit SHA from Vercel dashboard
git checkout <commit-sha>

# Or reset to that commit
git reset --hard <commit-sha>
```

## Step 6: Test Everything

### Local Testing:
```bash
npm run dev
```

Visit http://localhost:3000 and test:
- [ ] Login works
- [ ] Dashboard loads
- [ ] Tasks page shows tasks
- [ ] Can create new tasks
- [ ] Can upload files

### Production Testing:
Visit https://program-manager-iota.vercel.app and test the same items.

## Troubleshooting

### Issue: "No tasks found in database"
**Solution:** Run `npm run db:setup` to seed demo data

### Issue: "Site works in incognito but not regular browser"
**Solution:** Visit `/api/debug/clear-cache` or manually clear browser cache

### Issue: "Database connection failed"
**Solution:** Check that DATABASE_URL and DIRECT_URL are correct in both local and Vercel

### Issue: "Different data in local vs production"
**Solution:** You might be connected to different databases. Verify the Supabase project ID in both DATABASE_URL strings.

### Issue: "Vercel deployment uses old code"
**Solution:** Check which Git commit is deployed. You may need to push latest changes or use Vercel's "Redeploy" button.

## Quick Reference Commands

```bash
# Verify database connection and data
npm run db:verify

# Seed database with demo data
npm run db:setup

# Start local development server
npm run dev

# Check current Git commit
git log --oneline -1

# View recent commits
git log --oneline -10

# Push changes to trigger Vercel deployment
git push origin main
```

## Important Notes

1. **Never commit `.env.local`** - It contains secrets and is in `.gitignore`
2. **Vercel environment variables are separate** - They don't sync with your local `.env.local`
3. **Production and local can use different NEXTAUTH_SECRET** - This is normal and recommended
4. **Always use the same Supabase project** - Both local and production should point to `fegstrmxiitzwldmrowm.supabase.co`
5. **Service workers can cause cache issues** - Clear them when debugging strange behavior
