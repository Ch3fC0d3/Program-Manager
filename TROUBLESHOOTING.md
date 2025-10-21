# Troubleshooting Guide

## 🔴 **Current Issues & Fixes**

### **Issue 1: 500 Internal Server Error on API Endpoints**

**Symptoms:**
- `/api/user/notification-preferences` returns 500 error
- `/api/tasks/[id]` returns 500 error  
- `/api/cards/[id]/suggestion` returns 500 error

**Cause:**
The database schema changes (NotificationType enum fix) weren't fully applied to the database. The Prisma client is out of sync with the actual database.

**Fix:**
Run the quick database sync script:

```powershell
.\scripts\quick-db-fix.ps1
```

Or manually:
```powershell
# Stop dev server first
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Sync schema (safe, no data loss)
npx prisma db push

# Regenerate client
npx prisma generate

# Restart dev server
npm run dev
```

---

### **Issue 2: 404 on /notifications Page**

**Symptoms:**
- Clicking "Notifications" in nav shows 404
- Browser console shows: `GET /notifications 404`

**Cause:**
The `/pages/notifications.tsx` file exists but Next.js isn't finding it, likely due to build cache issues.

**Fix:**
```powershell
# Clear Next.js cache
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue

# Restart dev server
npm run dev
```

---

### **Issue 3: WebSocket HMR Connection Failures**

**Symptoms:**
- Console shows: `WebSocket connection to 'ws://localhost:3000/_next/webpack-hmr' failed`
- Hot Module Replacement not working
- Page requires manual refresh

**Cause:**
Dev server was stopped/restarted while browser was still connected.

**Fix:**
1. Hard refresh browser: `Ctrl + Shift + R`
2. Or close all browser tabs and reopen
3. Or restart dev server

---

### **Issue 4: Missing Favicon (404)**

**Symptoms:**
- Console shows: `GET /favicon.ico 404`

**Cause:**
No favicon file in `/public` directory.

**Fix (Optional):**
Add a favicon.ico file to `/public/` directory, or ignore (cosmetic issue only).

---

## 🛠️ **Complete Fix Procedure**

Run these commands in order:

```powershell
# 1. Stop everything
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# 2. Clean caches
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue

# 3. Sync database
npx prisma db push

# 4. Regenerate Prisma client
npx prisma generate

# 5. Restart dev server
npm run dev
```

Or use the quick fix script:
```powershell
.\scripts\quick-db-fix.ps1
```

---

## 🔍 **Verification Steps**

After applying fixes, verify:

### **1. Check API Endpoints:**
Open browser DevTools → Network tab, then visit:
- http://localhost:3000/notifications
- Should load without 404

### **2. Check Database Connection:**
```powershell
npx prisma studio
```
Should open Prisma Studio without errors.

### **3. Check Prisma Client:**
```powershell
npx prisma validate
```
Should show: "The schema is valid ✔"

### **4. Test Notifications Page:**
1. Navigate to http://localhost:3000/notifications
2. Should load without errors
3. Check browser console for errors

---

## 🚨 **If Issues Persist**

### **Nuclear Option: Full Reset**

⚠️ **WARNING: This will delete all data!**

```powershell
# Stop server
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force

# Reset database
npx prisma migrate reset --force

# Clean everything
Remove-Item -Recurse -Force .next -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force node_modules\.prisma -ErrorAction SilentlyContinue

# Regenerate
npx prisma generate

# Restart
npm run dev
```

### **Check Logs:**

Look at terminal output for specific errors:
- Prisma errors → Database connection issues
- TypeScript errors → Type mismatches
- Next.js errors → Build/routing issues

---

## 📝 **Common Error Messages**

### **"PrismaClientInitializationError"**
**Fix:** Run `npx prisma generate`

### **"Cannot find module '@prisma/client'"**
**Fix:** Run `npm install` then `npx prisma generate`

### **"Migration failed"**
**Fix:** Run `npx prisma db push` instead

### **"EPERM: operation not permitted"**
**Fix:** Stop dev server, then try again

### **"Port 3000 already in use"**
**Fix:**
```powershell
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

---

## 🔐 **Security Fixes Applied**

All security fixes from the code review are still active:
- ✅ API keys secured in `.env.example`
- ✅ RBAC implemented
- ✅ Input validation active
- ✅ Security headers configured
- ✅ HTTPS certificates generated
- ✅ Database transactions
- ✅ Error handling improved

These fixes don't affect security improvements.

---

## 📚 **Related Documentation**

- `/SECURITY.md` - Security guidelines
- `/SECURITY_FIXES_APPLIED.md` - Security changes log
- `/HTTPS_SETUP.md` - HTTPS configuration
- `/scripts/prisma-refresh.ps1` - Prisma refresh script
- `/scripts/quick-db-fix.ps1` - Quick database fix

---

## 🆘 **Getting Help**

If you're still experiencing issues:

1. **Check terminal output** for specific error messages
2. **Check browser console** for client-side errors
3. **Run diagnostics:**
   ```powershell
   npx prisma validate
   npx prisma db pull
   npm run build
   ```
4. **Review recent changes** in git history

---

**Last Updated:** After security fixes implementation  
**Status:** Database sync required after schema changes
