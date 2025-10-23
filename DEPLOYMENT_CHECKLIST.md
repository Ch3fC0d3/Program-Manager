# Deployment Checklist - Financial System

## Pre-Deployment Tasks

### 1. Database & Schema
- [x] Prisma schema updated with financial models
- [x] Migration created: `20251023132218_add_budget_line_items`
- [ ] **IMPORTANT**: Review `.env` and `.env.local` files
  - Ensure `DATABASE_URL` points to production database
  - Ensure `DIRECT_URL` is set for production
  - Verify `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`
- [ ] Run migration on production database:
  ```bash
  npx prisma migrate deploy
  ```
- [ ] Seed production with initial data (optional):
  ```bash
  npx prisma db seed
  ```

### 2. Environment Variables
Verify all required environment variables are set in production:

```bash
# Database
DATABASE_URL=
DIRECT_URL=

# Supabase
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
UPLOAD_BUCKET=

# NextAuth
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# AI (Optional)
HUGGINGFACE_API_KEY=
```

### 3. Code Quality
- [ ] TypeScript errors resolved (restart TS server if needed)
- [ ] Run linter: `npm run lint`
- [ ] Run type check: `npx tsc --noEmit`
- [ ] Test build locally: `npm run build`
- [ ] Test production build: `npm start`

### 4. Testing
- [ ] Test financial dashboard at `/financials`
- [ ] Test budget alerts functionality
- [ ] Test CSV export
- [ ] Test JSON export
- [ ] Test AI expense classification with auto-allocation
- [ ] Verify budget vs actual calculations
- [ ] Test with multiple boards
- [ ] Test period filters (month/quarter/year)

### 5. Git & Version Control
- [ ] Commit all changes:
  ```bash
  git add .
  git commit -m "Add financial management system with budgets, alerts, and exports"
  ```
- [ ] Push to repository:
  ```bash
  git push origin main
  ```
- [ ] Tag release (optional):
  ```bash
  git tag -a v1.1.0 -m "Financial Management System Release"
  git push origin v1.1.0
  ```

## Deployment Steps

### Option 1: Vercel (Recommended for Next.js)

1. **Connect Repository**
   - Go to [vercel.com](https://vercel.com)
   - Import your GitHub repository
   - Select the project

2. **Configure Environment Variables**
   - Add all environment variables from `.env.local`
   - Ensure `DATABASE_URL` points to production Supabase
   - Set `NEXTAUTH_URL` to your production domain

3. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Verify deployment at provided URL

4. **Run Database Migration**
   - In Vercel dashboard, go to Settings → Environment Variables
   - Ensure `DATABASE_URL` is correct
   - Run migration via Vercel CLI or manually:
     ```bash
     vercel env pull .env.production
     npx prisma migrate deploy
     ```

### Option 2: Manual Deployment

1. **Build Application**
   ```bash
   npm run build
   ```

2. **Upload Files**
   - Upload `.next`, `public`, `node_modules`, `package.json`, `prisma` folders
   - Upload `.env.production` with production environment variables

3. **Run on Server**
   ```bash
   npm start
   ```

4. **Run Migration**
   ```bash
   npx prisma migrate deploy
   ```

## Post-Deployment Verification

### 1. Smoke Tests
- [ ] Visit production URL
- [ ] Login with admin credentials
- [ ] Navigate to `/financials`
- [ ] Verify dashboard loads with data
- [ ] Test alerts button
- [ ] Test export buttons
- [ ] Upload a test invoice via AI classification
- [ ] Verify auto-allocation works

### 2. Performance Checks
- [ ] Check page load times
- [ ] Verify API response times
- [ ] Monitor database query performance
- [ ] Check for console errors

### 3. Security Review
- [ ] Verify authentication works
- [ ] Test unauthorized access (should redirect to login)
- [ ] Ensure API endpoints require authentication
- [ ] Check that sensitive data is not exposed

### 4. Monitoring Setup
- [ ] Set up error tracking (Sentry, LogRocket, etc.)
- [ ] Configure uptime monitoring
- [ ] Set up database backup schedule
- [ ] Enable application logs

## Rollback Plan

If issues occur:

1. **Revert Code**
   ```bash
   git revert HEAD
   git push origin main
   ```

2. **Rollback Database** (if needed)
   ```bash
   npx prisma migrate resolve --rolled-back 20251023132218_add_budget_line_items
   ```

3. **Restore from Backup**
   - Use Supabase dashboard to restore from backup
   - Or use database backup tool

## New Features Deployed

### ✅ Budget Categories
- 10 budget categories: Water/Desal, Helium, Operations, Community, Legal, Labor, Utilities, Marketing, Technology, Insurance
- Total budget: $945,000

### ✅ Budget Alerts
- **API**: `/api/financials/alerts`
- **Thresholds**:
  - Warning: 75-90% used
  - Critical: 90-100% used
  - Exceeded: >100% used
- **UI**: Alert modal with severity indicators

### ✅ Export Functionality
- **API**: `/api/financials/export?format=csv|json`
- **Formats**: CSV and JSON
- **Data**: Budget vs actual by category with variance

### ✅ AI Enhancements
- Auto-creates `ExpenseLineItem` from invoices
- Auto-allocates expenses to matching budgets
- Updates `BudgetSnapshot` after allocation
- Intelligent matching by category, board, vendor, date

## Support & Documentation

- **System Documentation**: `/docs/FINANCIAL_SYSTEM.md`
- **API Documentation**: See individual API files
- **User Guide**: Create user-facing documentation as needed

## Notes

- **TypeScript Warnings**: IDE may show errors for new Prisma models until TypeScript server restarts. These are cosmetic and don't affect runtime.
- **Seed Data**: Production seed is optional. Consider creating production-specific seed data.
- **Backup**: Always backup production database before running migrations.
- **Testing**: Test thoroughly in staging environment before production deployment.

## Deployment Date

- **Date**: _____________
- **Deployed By**: _____________
- **Version**: v1.1.0
- **Status**: ☐ Success ☐ Failed ☐ Rolled Back

## Issues Encountered

_Document any issues and resolutions here_

---

**Deployment Complete!** 🚀
