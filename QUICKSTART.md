# Quick Start Guide

Get up and running in 5 minutes!

## Installation

```bash
# 1. Install dependencies
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your database URL

# 3. Set up database
npx prisma migrate dev
npx prisma db seed

# 4. Start the app
npm run dev
```

## Login

Open `http://localhost:3000` and login with:
- **Email**: `admin@example.com`
- **Password**: `admin123`

## Key Features Overview

### 📋 Boards
- Create project boards
- Organize by workstreams (Helium, Water/Desal, Community, etc.)
- Share with team members

### ✅ Tasks
- **5 Status Columns**: Backlog → Next 7 Days → In Progress → Blocked → Done
- Drag & drop between statuses
- Assign to team members
- Set due dates and priorities
- Add custom fields

### 🏷️ Labels
Pre-configured categories:
- **Helium** (Purple)
- **Water/Desal** (Blue)
- **Community** (Green)
- **Vendors** (Orange)
- **Finance/Legal** (Red)

### 📎 Attachments
- Upload PDFs, images, drawings
- Quick preview
- Store quotes and documents

### ✓ Checklists
- Break down tasks into steps
- Track progress
- Reusable templates

### 💬 Comments & @Mentions
- Discuss tasks in context
- Mention team members with @
- Get notified

### 📅 Calendar View
- See all deadlines
- Month and list views
- Filter by assignee

### 📊 Dashboard
- Overview of your tasks
- Due this week
- Blocked items
- Recent boards

### 🔍 Search
- Search across all tasks
- Find comments and attachments
- Filter results

### 📥 Import/Export
- Bulk import from CSV
- Export to CSV
- Easy data migration

### 📱 Mobile & Offline
- Works offline
- Install as PWA
- Syncs when online

## Common Workflows

### Create a New Project

1. Click **New Board** from dashboard
2. Name it (e.g., "Site A Water Well")
3. Add team members
4. Create labels for your workstreams

### Add a Task

1. Open your board
2. Click **+ New Task** or click **+** in any column
3. Fill in details:
   - Title
   - Description
   - Assignee
   - Due date
   - Labels
   - Priority

### Track Progress

1. Add checklists to break down work
2. Comment with updates
3. Drag tasks between columns as they progress
4. Mark complete when done

### Collaborate

1. @mention team members in comments
2. Share board with stakeholders
3. Set permissions (Owner/Admin/Member/Viewer)
4. Export reports as needed

## Tips & Tricks

- **Keyboard Shortcuts**: Press `Ctrl+K` for command palette (coming soon)
- **Quick Add**: Click + in any column to add task directly to that status
- **Bulk Actions**: Use CSV import for multiple tasks
- **Templates**: Save common task structures as templates
- **Custom Fields**: Add well IDs, permit numbers, etc. in task custom fields
- **Dependencies**: Link tasks that block each other
- **Reminders**: Set automatic reminders for due dates

## Mobile Usage

### Install on Phone

1. Open app in mobile browser
2. Tap browser menu
3. Select "Add to Home Screen"
4. App icon appears on home screen

### Offline Mode

- View cached tasks offline
- Make changes offline
- Syncs automatically when online

## Sample Use Cases

### Water Well Drilling Project

1. Create board: "Site A - Water Well"
2. Add labels: Water/Desal, Vendors, Finance/Legal
3. Create tasks:
   - Site survey
   - Obtain permits
   - Equipment mobilization
   - Drilling operations
   - Well testing
4. Add checklist to each task
5. Assign to team members
6. Track in Kanban view

### Helium Vendor Outreach

1. Create task: "Q1 Helium Vendor Outreach"
2. Add labels: Helium, Vendors
3. Add checklist:
   - Research vendors
   - Request quotes
   - Compare pricing
   - Schedule calls
   - Negotiate terms
4. Attach vendor quotes
5. Comment with notes from calls

### Community Meeting

1. Create task: "Chapter 3 Community Meeting"
2. Add label: Community
3. Set due date
4. Add checklist:
   - Prepare presentation
   - Book venue
   - Send invitations
   - Print materials
5. Attach presentation files
6. Track RSVPs in comments

## Next Steps

1. ✅ Create your first board
2. ✅ Invite team members
3. ✅ Set up labels for your workstreams
4. ✅ Import existing tasks (if any)
5. ✅ Create task templates
6. ✅ Set up automations
7. ✅ Install on mobile devices

## Need Help?

- 📖 Full documentation: [README.md](README.md)
- 🔧 Setup issues: [SETUP.md](SETUP.md)
- 🐛 Report bugs: Open GitHub issue
- 💡 Feature requests: Open GitHub issue

---

**You're all set!** Start managing your projects efficiently. 🚀
