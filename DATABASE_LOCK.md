# 🔒 DATABASE CONFIGURATION LOCK

## ⚠️ CRITICAL: Production Database Information

**Date Locked:** November 22, 2025  
**Locked By:** System Administrator

---

## ✅ CORRECT Production Database

**Supabase Project ID:** `iuwduqzamfjvgzlnndoh`  
**Database Host:** `db.iuwduqzamfjvgzlnndoh.supabase.co`  
**Project URL:** `https://iuwduqzamfjvgzlnndoh.supabase.co`

### This database contains:
- ✅ 13 production tasks
- ✅ Environmental Assessment
- ✅ Cultural assessment
- ✅ Grazing Permits Consents
- ✅ Chapter Consents
- ✅ Surveyor
- ✅ 164 Review Process (with 7 subtasks)
- ✅ All production contacts, vendors, and expenses

---

## ❌ WRONG Database (DO NOT USE)

**Supabase Project ID:** `fegstrmxiitzwldmrowm`  
**Database Host:** `db.fegstrmxiitzwldmrowm.supabase.co`

### Why this is wrong:
- ❌ Only contains 1-6 tasks
- ❌ Missing production data
- ❌ Was accidentally used during development

---

## 🔐 How to Prevent Database Switching

### 1. Vercel Environment Variables
Always verify these in Vercel Dashboard → Settings → Environment Variables:

```bash
DATABASE_URL=postgresql://postgres:RedQueen12!!@db.iuwduqzamfjvgzlnndoh.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:RedQueen12!!@db.iuwduqzamfjvgzlnndoh.supabase.co:5432/postgres
SUPABASE_URL=https://iuwduqzamfjvgzlnndoh.supabase.co
```

### 2. Local Development
Your `.env.local` should match `.env.production` (see that file for reference)

### 3. Before Any Database Change
Run this verification script:
```bash
npm run db:find-tasks
```

**Expected output:** Should show 13 tasks including the 5 main tasks listed above.

If you see fewer tasks, **STOP** - you're connected to the wrong database!

---

## 🚨 Emergency Recovery

If you accidentally switch databases:

1. **Stop all deployments immediately**
2. **Check `.env.production` file** for correct values
3. **Update Vercel environment variables** to match `.env.production`
4. **Run verification:** `npm run db:find-tasks`
5. **Redeploy** only after verification passes

---

## 📋 Verification Checklist

Before deploying to production:

- [ ] Run `npm run db:find-tasks`
- [ ] Verify output shows 13 tasks
- [ ] Check that "Environmental Assessment" is in the list
- [ ] Check that "Cultural assessment" is in the list
- [ ] Check that "Grazing Permits Consents" is in the list
- [ ] Verify Vercel env vars match `.env.production`

---

## 📞 Contact

If you need to change the database configuration, document the reason here:

**Change Log:**
- 2025-11-22: Initial lock - Identified correct production database (iuwduqzamfjvgzlnndoh)

---

**Remember:** When in doubt, check `.env.production` and run `npm run db:find-tasks`!
