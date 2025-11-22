# Browser Cache Fix Guide

## Problem: Site Works in Incognito But Not Regular Browser

This is a **browser caching issue** caused by service workers and cached data.

## Quick Fix (Recommended)

### Option 1: Use the Automatic Cache Clearing Endpoint

Visit this URL in your browser:

**Production:**
```
https://program-manager-iota.vercel.app/api/debug/clear-cache
```

**Local:**
```
http://localhost:3000/api/debug/clear-cache
```

This will automatically:
- ✅ Clear localStorage
- ✅ Clear sessionStorage
- ✅ Unregister all service workers
- ✅ Delete all browser caches
- ✅ Redirect you to login

**Wait 2 seconds** for the process to complete, then you'll be redirected to the login page.

---

## Manual Fix (If Automatic Doesn't Work)

### Step 1: Clear Browser Cache

#### Chrome / Edge:
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select **All time** from the dropdown
3. Check these boxes:
   - ✅ Cookies and other site data
   - ✅ Cached images and files
4. Click **Clear data**

#### Firefox:
1. Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
2. Select **Everything** from the dropdown
3. Check these boxes:
   - ✅ Cookies
   - ✅ Cache
4. Click **Clear Now**

### Step 2: Clear Service Worker

1. Open DevTools (`F12` or right-click → Inspect)
2. Go to **Application** tab (Chrome/Edge) or **Storage** tab (Firefox)
3. In the left sidebar, click **Service Workers**
4. Click **Unregister** next to any service workers listed
5. If you see multiple service workers, unregister all of them

### Step 3: Clear Site Data

Still in DevTools Application/Storage tab:

1. Click **Clear storage** in the left sidebar (Chrome/Edge) or **Storage** (Firefox)
2. Make sure all boxes are checked:
   - ✅ Application cache
   - ✅ Cache storage
   - ✅ IndexedDB
   - ✅ Local storage
   - ✅ Session storage
   - ✅ Service workers
3. Click **Clear site data**

### Step 4: Hard Refresh

After clearing everything:

1. Close DevTools
2. Do a hard refresh:
   - **Windows:** `Ctrl+Shift+R` or `Ctrl+F5`
   - **Mac:** `Cmd+Shift+R`

---

## Verify the Fix

1. Close all browser tabs for the site
2. Open a new tab
3. Navigate to your site
4. Try logging in

If it still doesn't work, try these additional steps:

### Nuclear Option: Reset Browser for This Site

#### Chrome / Edge:
1. Go to `chrome://settings/content/all` (or `edge://settings/content/all`)
2. Search for your site domain
3. Click the trash icon to remove all site data
4. Restart the browser

#### Firefox:
1. Go to `about:preferences#privacy`
2. Scroll to **Cookies and Site Data**
3. Click **Manage Data**
4. Search for your site domain
5. Click **Remove Selected**
6. Restart the browser

---

## Why This Happens

Service workers are designed to cache your app for offline use. However, when you deploy new code:

1. The old service worker may still be active
2. It serves cached files instead of fetching new ones
3. This causes the app to use old code/data
4. Incognito mode works because it doesn't use cached service workers

## Prevent Future Issues

### For Developers:

Add this to your service worker update logic (already in place):

```javascript
// Force update on new version
self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});
```

### For Users:

When you notice the site behaving strangely:
1. First try a hard refresh (`Ctrl+Shift+R`)
2. If that doesn't work, visit `/api/debug/clear-cache`
3. As a last resort, use incognito mode temporarily

---

## Additional Troubleshooting

### Issue: "Clear cache endpoint doesn't work"

**Solution:** The endpoint might be cached itself. Try:
1. Open DevTools (`F12`)
2. Go to Network tab
3. Check "Disable cache"
4. Visit the clear-cache endpoint again

### Issue: "Still seeing old data after clearing cache"

**Solution:** This might be a database issue, not cache:
1. Run `npm run db:verify` to check your database
2. Make sure you're connected to the correct database
3. Check Vercel environment variables match your local `.env.local`

### Issue: "Login works but dashboard shows old data"

**Solution:** This is likely an API cache issue:
1. Check your API routes for caching headers
2. Verify your database connection
3. Check if you're hitting the correct API endpoints

---

## Quick Reference

| Action | Command/URL |
|--------|-------------|
| Auto clear cache (prod) | https://program-manager-iota.vercel.app/api/debug/clear-cache |
| Auto clear cache (local) | http://localhost:3000/api/debug/clear-cache |
| Hard refresh | `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac) |
| Open DevTools | `F12` or right-click → Inspect |
| Clear browser data | `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac) |

---

## Still Having Issues?

If none of these solutions work:

1. Check the browser console for errors (`F12` → Console tab)
2. Check the Network tab to see what requests are failing
3. Verify you're using the correct URL (production vs local)
4. Make sure your Vercel deployment is using the latest code
5. Run `npm run db:verify` to check database connectivity

For database issues, see `VERCEL_SYNC_GUIDE.md`
