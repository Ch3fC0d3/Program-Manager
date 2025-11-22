# Action Plan: Restore Production Environment

## Current Status

✅ **Database Verification Complete**
- Connected to: `fegstrmxiitzwldmrowm.supabase.co`
- Found: 2 users, 6 boards (5 archived), **only 1 task**
- ⚠️ **Missing demo tasks** (expected at least 5)

✅ **Tools Created**
- Database verification script: `npm run db:verify`
- Cache clearing endpoint: `/api/debug/clear-cache`
- Comprehensive documentation

## Immediate Actions Required

### 1. Fix Browser Cache Issue (Site Only Works in Incognito)

**Quick Fix:**
Visit this URL in your browser:
```
https://program-manager-iota.vercel.app/api/debug/clear-cache
```

This will automatically clear all caches and service workers.

**Manual Fix:**
See detailed instructions in `BROWSER_CACHE_FIX.md`

---

### 2. Verify Vercel Environment Variables

**Steps:**
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Compare with your local `.env.local` file
3. Ensure these match for **Production** environment:
   - `DATABASE_URL` (should contain `fegstrmxiitzwldmrowm.supabase.co`)
   - `DIRECT_URL` (should contain `fegstrmxiitzwldmrowm.supabase.co`)
   - `SUPABASE_URL` (should be `https://fegstrmxiitzwldmrowm.supabase.co`)
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `NEXTAUTH_SECRET`
   - `NEXTAUTH_URL` (should be your production URL)

**See:** `VERCEL_SYNC_GUIDE.md` for detailed comparison checklist

---

### 3. Restore Missing Tasks

Your database currently has **only 1 task** but should have at least 5 demo tasks.

**Option A: Re-seed the Database (Recommended)**

⚠️ **WARNING:** This will create duplicate data if run multiple times!

```bash
npm run db:setup
```

**Option B: Manually Create Tasks**

Use the web interface to create tasks manually.

**Option C: Clean Database and Re-seed**

If you have too many duplicate boards (you currently have 5 archived duplicates):

1. Manually delete archived boards in the UI
2. Run `npm run db:setup` to add demo tasks

---

### 4. Verify Local Environment Matches Production

**Run verification script:**
```bash
npm run db:verify
```

**Expected output:**
- ✅ Database connection successful
- ✅ 2+ users found
- ✅ 1+ active boards
- ✅ 5+ tasks found
- ✅ Environment variables pointing to correct Supabase project

---

### 5. Check Git Commit Sync

**Check your current local commit:**
```bash
git log --oneline -1
```

**Check Vercel production deployment:**
1. Go to Vercel Dashboard → Deployments
2. Find the deployment with **Production** badge
3. Note the Git commit SHA

**If they don't match:**
- Push your latest code: `git push origin main`
- Or checkout the production commit: `git checkout <commit-sha>`

---

## Testing Checklist

After completing the above actions, test the following:

### Local Testing (http://localhost:3000)
- [ ] Run `npm run dev`
- [ ] Login works
- [ ] Dashboard loads
- [ ] Tasks page shows tasks
- [ ] Can create new tasks
- [ ] Can upload files to contacts

### Production Testing (https://program-manager-iota.vercel.app)
- [ ] Clear browser cache first (visit `/api/debug/clear-cache`)
- [ ] Login works
- [ ] Dashboard loads
- [ ] Tasks page shows tasks
- [ ] Can create new tasks
- [ ] Can upload files to contacts

---

## Quick Reference Commands

```bash
# Verify database connection and data
npm run db:verify

# Seed database with demo data (WARNING: creates duplicates if run multiple times)
npm run db:setup

# Start local development server
npm run dev

# Check current Git commit
git log --oneline -1

# Push changes to trigger Vercel deployment
git push origin main
```

---

## Quick Reference URLs

| Purpose | URL |
|---------|-----|
| Clear cache (production) | https://program-manager-iota.vercel.app/api/debug/clear-cache |
| Clear cache (local) | http://localhost:3000/api/debug/clear-cache |
| Production site | https://program-manager-iota.vercel.app |
| Vercel dashboard | https://vercel.com/dashboard |
| Supabase dashboard | https://supabase.com/dashboard |

---

## Documentation Files

- **`VERCEL_SYNC_GUIDE.md`** - Complete guide for syncing Vercel environment with local
- **`BROWSER_CACHE_FIX.md`** - Detailed instructions for fixing browser cache issues
- **`ACTION_PLAN.md`** - This file - quick action plan and checklist

---

## Current Issues Summary

### Issue 1: Site Only Works in Incognito
**Cause:** Service worker and browser cache holding old code  
**Fix:** Visit `/api/debug/clear-cache` or see `BROWSER_CACHE_FIX.md`

### Issue 2: Missing Tasks in Database
**Cause:** Database has only 1 task (expected at least 5 demo tasks)  
**Fix:** Run `npm run db:setup` to seed demo data (⚠️ creates duplicates)

### Issue 3: Multiple Archived Duplicate Boards
**Cause:** Seed script run multiple times  
**Fix:** Manually delete archived boards in UI, or ignore them

### Issue 4: Git Commit Mismatch
**Cause:** Local code may be different from production deployment  
**Fix:** Check commits and sync (see step 5 above)

---

## Next Steps After Fixing

Once everything is working:

1. **Test thoroughly** - Use both local and production
2. **Document any custom changes** - Update `.env.example` if needed
3. **Clean up duplicate data** - Delete archived duplicate boards
4. **Consider database backup** - Export data before making changes
5. **Re-apply recent fixes** - Contact image upload fix, etc.

---

## Need Help?

If issues persist:

1. Check browser console for errors (`F12` → Console)
2. Check Network tab for failed requests (`F12` → Network)
3. Run `npm run db:verify` to check database
4. Check Vercel deployment logs
5. Verify environment variables in Vercel dashboard

---

## Important Notes

- ✅ Your local and production use the **same database**: `fegstrmxiitzwldmrowm.supabase.co`
- ✅ The Nov 12 deployment commit (`6c81c6b`) exists in your local repo
- ✅ Your `package.json` is essentially the same as Nov 12 version
- ⚠️ Running seed script multiple times creates duplicate data
- ⚠️ Service workers can cause cache issues - clear them when debugging
- ⚠️ `.env.local` is not in Git - Vercel environment variables are separate
