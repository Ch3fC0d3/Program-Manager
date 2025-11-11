# 🔧 FIX: Add Yourself to "Water & Helium Operations" Board

## The Problem
You're logged in as **gabriel@pellegrini.us** but you're not a member of the "Water & Helium Operations" board.

## Quick Fix - Option 1: Browser Console

1. Open your browser's Developer Console (F12)
2. Go to the **Console** tab
3. Paste this code and press Enter:

```javascript
fetch('/api/boards/cmh5g1s250003na7ssuyq1wpf/add-me', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' }
})
.then(r => r.json())
.then(data => {
  console.log(data)
  alert('Success! Reloading page...')
  window.location.reload()
})
.catch(err => {
  console.error(err)
  alert('Error: ' + err.message)
})
```

4. The page will reload and you'll see the board!

---

## Quick Fix - Option 2: Have Admin Add You

Ask someone logged in as **admin@example.com** to:

1. Go to the board: `/boards/cmh5g1s250003na7ssuyq1wpf`
2. Click "Manage Members"
3. Add **Gabriel Pellegrini (gabriel@pellegrini.us)** as a member

---

## Quick Fix - Option 3: Run Script

In your terminal, run:

```bash
npx tsx scripts/add-user-to-board.ts
```

This will automatically add you to the board.

---

## Board Details

**Board Name:** Water & Helium Operations  
**Board ID:** `cmh5g1s250003na7ssuyq1wpf`  
**Tasks:** 14  
**Current Members:**
- Admin User (admin@example.com) - OWNER
- Ginny Pellegrini (ginpell359@gmail.com) - MEMBER
- Tom Pellegrini (tom@pellegrini.us) - MEMBER
- Tom Pellegrini (tompell@swbell.net) - MEMBER
- Tully Begay (tazzbegay@gmail.com) - MEMBER

**Missing:** Gabriel Pellegrini (gabriel@pellegrini.us) ← YOU

---

## After Adding Yourself

1. Refresh the `/boards` page
2. You should see "Water & Helium Operations" in Active Boards
3. Click on it to access your 14 tasks
