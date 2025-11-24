# Production Environment & Database Playbook

This document explains **how to keep your local, GitHub, and Vercel environments in sync with the ONE correct production database**, and how to avoid the issues you just hit.

---

## 1. Canonical Production Database

**This is the ONLY database production should ever use.**

- **Supabase Project ID:** `iuwduqzamfjvgzlnndoh`
- **Database Host:** `db.iuwduqzamfjvgzlnndoh.supabase.co`
- **Project URL:** `https://iuwduqzamfjvgzlnndoh.supabase.co`

### Known-good data in this DB

- 13 production tasks
- Includes:
  - Environmental Assessment
  - Cultural assessment
  - Grazing Permits Consents
  - Chapter Consents
  - Surveyor
  - 164 Review Process (+ 7 subtasks)

**If you ever connect to a DB that does NOT contain this exact set of tasks, STOP – it is not the real production DB.**

---

## 2. Environment Variable Rules

### 2.1 Local: `.env` and `.env.local`

To avoid talking to two different databases:

- **`.env` and `.env.local` must always point to the SAME Supabase project.**
- When you change DBs, update **both** files together.

Typical local values (for this project):

```bash
# Direct DB connection
DATABASE_URL=postgresql://postgres:RedQueen12!!@db.iuwduqzamfjvgzlnndoh.supabase.co:5432/postgres
DIRECT_URL=postgresql://postgres:RedQueen12!!@db.iuwduqzamfjvgzlnndoh.supabase.co:5432/postgres

SUPABASE_URL=https://iuwduqzamfjvgzlnndoh.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Important:** Prisma CLI and scripts read `.env` first. If `.env` points to the wrong database, scripts like `prisma migrate` or custom scripts will hit the wrong DB even if `.env.local` is correct.

### 2.2 Vercel: Production Environment Variables

In **Vercel → Project → Settings → Environment Variables → Production**:

- **DATABASE_URL** → **Transaction pooler (Shared Pooler) URI** from Supabase
- **DIRECT_URL** → **Direct connection URI** from Supabase
- **SUPABASE_URL / ANON / SERVICE_ROLE** → values for `iuwduqzamfjvgzlnndoh`

Example shapes (not exact secrets):

```bash
# Pooled connection for serverless (Vercel functions)
DATABASE_URL=postgresql://postgres.iuwduqzamfjvgzlnndoh:[PASSWORD]@aws-1-us-east-2.pooler.supabase.com:6543/postgres?pgbouncer=true

# Direct connection for migrations
DIRECT_URL=postgresql://postgres:RedQueen12!!@db.iuwduqzamfjvgzlnndoh.supabase.co:5432/postgres

SUPABASE_URL=https://iuwduqzamfjvgzlnndoh.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
```

**Key point:** Changing env vars in Vercel affects **only new deployments**. You must redeploy or push to GitHub for them to take effect.

---

## 3. Pre‑Deploy Safety Checklist

Run this every time before you deploy or touch production DB config.

### 3.1 Verify local is on the correct DB

From the project root:

```bash
npm run db:verify-production
```

This script checks:

- `DATABASE_URL` contains the correct project ID `iuwduqzamfjvgzlnndoh`
- There are at least 13 tasks
- The key task titles exist (Environmental Assessment, Cultural assessment, etc.)

If this script **fails**, fix `.env` / `.env.local` before doing anything else.

### 3.2 Push code to GitHub to trigger Vercel deploy

```bash
git add .
git commit -m "your message"
git push origin main
```

This creates a new Vercel deployment using the current env vars.

### 3.3 Verify schema on production

After the deploy is **Ready**, open this in the browser (while logged in as admin):

```text
https://program-manager-iota.vercel.app/api/debug/check-schema
```

- `ok: true` at the top
- Each model in `results` should be `{ ok: true }`.
- If any model shows `{ ok: false, code: "P2022" }`, your database schema is missing a column Prisma expects.

### 3.4 Verify task data on production

Then open:

```text
https://program-manager-iota.vercel.app/api/debug/task-stats
```

Confirm:

- `totalTasks` is **13**
- `Water & Helium Operations` board has 13 tasks
- Sample tasks include the known titles.

### 3.5 Sanity‑check the UI

Use **incognito** first to avoid cache issues:

- `https://program-manager-iota.vercel.app/dashboard`
- `https://program-manager-iota.vercel.app/tasks`

Counts and tasks should match local.

If any of these checks fail, stop and fix that step before proceeding.

---

## 4. Handling Prisma/DB Schema Drift

If `/api/debug/check-schema` shows something like:

```json
"TimeEntry": {
  "ok": false,
  "error": "The column `TimeEntry.startedAt` does not exist in the current database.",
  "code": "P2022"
}
```

It means:

- The Prisma model defines `startedAt` on `TimeEntry`.
- The actual Supabase table is missing that column.

### 4.1 Fix via migrations (ideal if history is clean)

If Prisma migrations are trustworthy:

```bash
npx prisma migrate deploy
```

(using `DIRECT_URL` pointing at the production DB.)

### 4.2 Fix via manual SQL (what you did)

In Supabase SQL editor for project `iuwduqzamfjvgzlnndoh`:

```sql
ALTER TABLE "public"."TimeEntry"
  ADD COLUMN IF NOT EXISTS "startedAt" timestamp with time zone;

ALTER TABLE "public"."TimeEntry"
  ADD COLUMN IF NOT EXISTS "endedAt" timestamp with time zone;

ALTER TABLE "public"."TimeEntry"
  ADD COLUMN IF NOT EXISTS "minutes" integer;
```

Then re‑run:

```text
https://program-manager-iota.vercel.app/api/debug/check-schema
```

until `TimeEntry` reports `"ok": true`.

---

## 5. Avoiding Browser Cache & Service Worker Issues

A classic symptom:

- **Incognito** shows correct data (13 tasks).
- Normal browser window shows wrong data, 0 tasks, or old UI.

This almost always means **cache / service worker** problems, not a DB issue.

### 5.1 Quick rule

If something looks wrong:

1. Try in **incognito**.
2. If incognito is correct → backend is fine, your main profile is stale.

### 5.2 Hard reset for a site (Chrome/Edge)

For `https://program-manager-iota.vercel.app`:

1. Open the site.
2. Press `F12` to open DevTools.
3. Go to the **Application** tab.
4. In the left sidebar, click **Storage → Clear storage**.
5. Check all boxes (Cookies, Local storage, IndexedDB, Cache, etc.).
6. Click **Clear site data**.
7. In **Application → Service Workers**, click **Unregister** for any workers.
8. Refresh the page.

Repeat for any preview URLs you’ve used (e.g. `https://program-manager-<hash>.vercel.app`).

After this, your regular window should behave like incognito.

---

## 6. Production vs Preview URLs

- **Production URL (canonical):**

  ```text
  https://program-manager-iota.vercel.app
  ```

- **Preview URLs:** look like:

  ```text
  https://program-manager-xxxxxxxx-gs-projects-<hash>.vercel.app
  ```

Guidelines:

- Use the **production URL** for any real data checks and decisions.
- Use previews only for testing code changes.
- When verifying tasks or schema, always call:
  - `/api/debug/check-schema`
  - `/api/debug/task-stats`

  on **production**, not previews.

---

## 7. If You Ever Intentionally Switch Databases

If you intentionally move to a brand new Supabase project in the future:

1. Create the new Supabase project.
2. Run Prisma migrations or manual SQL to fully sync the schema.
3. Seed the minimum required data (admin user, key boards/tasks).
4. Update **both** `.env` and `.env.local` with the new connection strings.
5. Run:

   ```bash
   npm run db:verify-production
   ```

   Update the script’s expectations (task titles, counts) if needed.

6. Update **Vercel** env vars (DATABASE_URL, DIRECT_URL, SUPABASE_*). 
7. Push to GitHub to trigger a deployment.
8. Re‑run:
   - `/api/debug/check-schema`
   - `/api/debug/task-stats`

9. Update:
   - `.env.production`
   - `DATABASE_LOCK.md`
   - This `PRODUCTION_ENV_PLAYBOOK.md`

   to reflect the new canonical project.

Until all three (local, Vercel, Supabase) are updated and verified, **do not delete the old database**.

---

## 8. Quick Reference Commands

```bash
# Verify local is pointed at correct production DB
npm run db:verify-production

# List all tasks in current DB (for sanity checks)
npm run db:find-tasks

# Start local dev server
npm run dev

# Build locally (what Vercel runs)
npm run build

# Push changes to trigger Vercel deployment
git push origin main
```

Keep this playbook, `DATABASE_LOCK.md`, `.env.production`, and the debug endpoints together as your **safety net** so you don’t end up connected to the wrong database again.
