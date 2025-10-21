# 📧 Email-to-Task Quick Start

Create tasks by sending emails! Here's how to get started in 5 minutes.

---

## 🚀 Quick Setup

### 1. Configure Maileroo Inbound Route

Go to [Maileroo Dashboard](https://maileroo.com/dashboard) → Inbound:

```
Inbound Email: tasks@yourdomain.com
Webhook URL: https://yourdomain.com/api/email/inbound
Method: POST
Format: JSON
```

### 2. Update Environment Variables

Add to `.env.local`:

```env
INBOUND_EMAIL_ADDRESS="tasks@yourdomain.com"
NEXTAUTH_URL="https://yourdomain.com"
```

### 3. Deploy Your App

Your webhook must be publicly accessible (HTTPS required).

**For local testing:** Use [ngrok](https://ngrok.com)
```bash
ngrok http 3000
# Use: https://abc123.ngrok.io/api/email/inbound
```

---

## 📨 How to Use

### Basic Email

```
To: tasks@yourdomain.com
Subject: Fix login bug
Body: The login form is not validating emails correctly.
```

**Result:** Creates a task with MEDIUM priority in your default board.

---

### With Priority

```
To: tasks@yourdomain.com
Subject: [URGENT] Production server down
Body: Server is not responding. Need immediate attention.
```

**Result:** Creates a task with URGENT priority.

**Priority Keywords:**
- `[URGENT]` or `URGENT:` → URGENT priority
- `[HIGH]` or `HIGH:` → HIGH priority  
- `[LOW]` or `LOW:` → LOW priority
- No keyword → MEDIUM priority (default)

---

### With Tags

```
To: tasks@yourdomain.com
Subject: Fix bug #urgent #backend #security
Body: SQL injection vulnerability found in login endpoint.
```

**Result:** Creates a task with tags: `urgent`, `backend`, `security`

---

## ✅ Requirements

- ✅ You must be a **registered user** (email must match your account)
- ✅ You must be a **member of at least one board**
- ✅ Email must be sent from your registered email address

---

## 🎯 What Happens

1. **Email received** by Maileroo
2. **Forwarded** to your webhook
3. **User verified** (must be registered)
4. **Task created** in your default board
5. **Assigned to you** automatically
6. **Activity logged** with source: "email"

---

## 🐛 Troubleshooting

**"User not found"**  
→ Make sure you're sending from your registered email address

**"User must be a member of at least one board"**  
→ Join or create a board first

**Task not appearing**  
→ Check your default board (first board you joined)

---

## 📚 Full Documentation

For complete setup instructions, see:
- [MAILEROO_INBOUND_SETUP.md](./MAILEROO_INBOUND_SETUP.md) - Complete setup guide
- [EMAIL_SETUP.md](./EMAIL_SETUP.md) - General email configuration

---

## 💡 Pro Tips

1. **Forward emails** from other tools to create tasks automatically
2. **Use priority keywords** to set urgency: `[URGENT]`, `[HIGH]`, `[LOW]`
3. **Add hashtags** for organization: `#bug`, `#feature`, `#urgent`
4. **Email from your phone** for quick task creation on the go
5. **Set up email filters** to auto-forward certain emails to your task system

---

**That's it!** Start sending emails to create tasks. 🎉
