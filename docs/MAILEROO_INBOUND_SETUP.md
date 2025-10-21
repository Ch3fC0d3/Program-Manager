# Maileroo Inbound Email-to-Task Setup Guide

This guide explains how to configure **Maileroo Inbound** to allow users to create tasks by sending emails to your application.

---

## 📧 Overview

With Maileroo Inbound configured, users can:
- **Send an email** to a dedicated address (e.g., `tasks@yourdomain.com`)
- **Automatically create a task** in their default board
- **Set priority** using keywords in the subject line
- **Add tags** using hashtags in the subject

---

## 🚀 Setup Instructions

### Step 1: Configure Your Domain (Production Only)

1. **Add your domain** in Maileroo Dashboard
2. **Verify DNS records** (SPF, DKIM, DMARC)
3. **Wait for verification** (usually a few minutes)

> **Note:** For development/testing, you can use Maileroo's test email addresses without domain verification.

---

### Step 2: Set Up Inbound Route in Maileroo

1. **Log in** to [Maileroo Dashboard](https://maileroo.com/dashboard)

2. **Navigate to Inbound** section (or Email Routing)

3. **Create a new route:**
   - **Inbound Email Address:** `tasks@yourdomain.com` (or any address you prefer)
   - **Destination Type:** Webhook
   - **Webhook URL:** `https://yourdomain.com/api/email/inbound`
   - **Method:** POST
   - **Format:** JSON

4. **Save the route**

> **Important:** Replace `yourdomain.com` with your actual domain. For local testing, use a tool like **ngrok** to expose your localhost.

---

### Step 3: Update Environment Variables

Add to your `.env.local` file:

```env
# Email Inbound - Maileroo Inbound Email-to-Task
INBOUND_EMAIL_ADDRESS="tasks@yourdomain.com"
NEXTAUTH_URL="https://yourdomain.com"  # Must be publicly accessible
```

---

### Step 4: Deploy Your Application

Your webhook endpoint must be **publicly accessible** for Maileroo to send requests.

**For Production:**
- Deploy to Vercel, Netlify, Railway, etc.
- Ensure `https://yourdomain.com/api/email/inbound` is accessible

**For Local Development:**
Use **ngrok** to expose your localhost:

```bash
# Start your dev server
npm run dev

# In another terminal, start ngrok
ngrok http 3000

# Use the ngrok URL in Maileroo webhook configuration
# Example: https://abc123.ngrok.io/api/email/inbound
```

---

### Step 5: Test the Integration

1. **Send a test email** to `tasks@yourdomain.com`
   - **From:** Your registered user email
   - **Subject:** `Test task from email`
   - **Body:** `This is a test task created via email.`

2. **Check your application:**
   - Log in to your account
   - Navigate to your boards
   - You should see the new task in your default board

3. **Check server logs:**
   ```
   📧 Received inbound email: { from: 'user@example.com', subject: 'Test task from email' }
   ✅ Task created successfully: { taskId: 'xxx', title: 'Test task from email' }
   ```

---

## 📝 How It Works

### Email Format

**Subject Line:**
```
[HIGH] Fix login bug #urgent #backend
```

**Body:**
```
The login form is not validating email addresses correctly.
Users are able to submit invalid emails.

Steps to reproduce:
1. Go to login page
2. Enter invalid email
3. Click submit
```

### Task Creation

The system will:
1. ✅ **Verify sender** - Must be a registered user
2. ✅ **Extract priority** - From `[HIGH]`, `[URGENT]`, `[LOW]` in subject
3. ✅ **Extract tags** - From `#urgent`, `#backend` in subject
4. ✅ **Create task** - In sender's default board
5. ✅ **Assign to sender** - Automatically assigned to email sender
6. ✅ **Log activity** - Records creation via email

---

## 🎯 Email Syntax

### Priority Keywords

Add to the **subject line**:
- `[URGENT]` or `URGENT:` → Sets priority to URGENT
- `[HIGH]` or `HIGH:` → Sets priority to HIGH
- `[LOW]` or `LOW:` → Sets priority to LOW
- No keyword → Defaults to MEDIUM

**Examples:**
```
[URGENT] Production server down
HIGH: Review pull request #123
[LOW] Update documentation
```

### Tags (Hashtags)

Add hashtags anywhere in the **subject line**:
```
Fix bug #urgent #backend #security
```

Extracts tags: `urgent`, `backend`, `security`

---

## 🔒 Security & Permissions

### User Authentication
- **Only registered users** can create tasks via email
- Email sender must match a user account in the database
- User must be a member of at least one board

### Board Assignment
- Task is created in the user's **first board** (default board)
- User must have permission to create tasks on that board

### Error Handling
If the email sender is not registered:
```json
{
  "error": "User not found. Only registered users can create tasks via email.",
  "email": "unknown@example.com"
}
```

---

## 📊 Webhook Payload

Maileroo sends POST requests with this structure:

```json
{
  "from": "John Doe <john@example.com>",
  "to": "tasks@yourdomain.com",
  "subject": "[HIGH] Fix login bug #urgent",
  "text": "Plain text body of the email...",
  "html": "<p>HTML body of the email...</p>",
  "headers": {
    "message-id": "<xxx@mail.gmail.com>",
    "date": "Mon, 21 Oct 2024 10:00:00 +0000"
  },
  "attachments": [
    {
      "filename": "screenshot.png",
      "contentType": "image/png",
      "size": 12345,
      "content": "base64-encoded-content..."
    }
  ]
}
```

---

## 🛠️ API Endpoint

### POST `/api/email/inbound`

**Request Body:** (Sent by Maileroo)
```json
{
  "from": "user@example.com",
  "subject": "Task title",
  "text": "Task description"
}
```

**Response (Success):**
```json
{
  "success": true,
  "message": "Task created successfully from email",
  "task": {
    "id": "task_123",
    "title": "Task title",
    "description": "Task description",
    "priority": "HIGH",
    "status": "BACKLOG",
    "board": { "id": "board_456", "name": "My Board" },
    "creator": { "id": "user_789", "name": "John Doe" },
    "url": "https://yourdomain.com/tasks/task_123"
  }
}
```

**Response (Error):**
```json
{
  "error": "User not found",
  "email": "unknown@example.com"
}
```

---

## 🧪 Testing

### Manual Testing

1. **Send test email:**
   ```
   To: tasks@yourdomain.com
   Subject: [HIGH] Test task #testing
   Body: This is a test task created via email.
   ```

2. **Check logs:**
   ```bash
   # Watch your server logs
   npm run dev
   
   # You should see:
   📧 Received inbound email: { from: 'you@example.com', subject: '[HIGH] Test task #testing' }
   ✅ Task created successfully: { taskId: 'xxx', title: '[HIGH] Test task #testing' }
   ```

3. **Verify in app:**
   - Log in to your account
   - Go to Boards
   - Find the new task

### Automated Testing

You can test the webhook endpoint directly:

```bash
curl -X POST https://yourdomain.com/api/email/inbound \
  -H "Content-Type: application/json" \
  -d '{
    "from": "your-email@example.com",
    "to": "tasks@yourdomain.com",
    "subject": "[HIGH] Test task",
    "text": "This is a test task description."
  }'
```

---

## 🐛 Troubleshooting

### Issue: "User not found"
**Solution:** Ensure the email sender is registered in your application.

### Issue: "User must be a member of at least one board"
**Solution:** Add the user to a board before they can create tasks via email.

### Issue: Webhook not receiving emails
**Solutions:**
- Check Maileroo dashboard for delivery logs
- Verify webhook URL is publicly accessible
- Check server logs for errors
- Ensure HTTPS is enabled (required for webhooks)

### Issue: Task not appearing in app
**Solutions:**
- Check server logs for errors
- Verify user has permission to create tasks
- Refresh the boards page
- Check the correct board (task goes to user's first board)

---

## 📚 Use Cases

### 1. Quick Task Creation
Send an email from your phone to instantly create a task:
```
To: tasks@yourdomain.com
Subject: Buy groceries
Body: Milk, eggs, bread
```

### 2. Email Forwarding
Forward important emails to create tasks:
```
To: tasks@yourdomain.com
Subject: Fwd: [HIGH] Client request #urgent
Body: [Original email content]
```

### 3. Integration with Other Tools
Configure other tools to send emails to your task system:
- Zapier workflows
- IFTTT recipes
- Monitoring alerts
- Customer support tickets

---

## 🔐 Best Practices

1. **Use HTTPS** - Always use HTTPS for webhook endpoints
2. **Validate senders** - Only allow registered users to create tasks
3. **Rate limiting** - Consider adding rate limits to prevent abuse
4. **Monitor logs** - Watch for suspicious activity
5. **Test thoroughly** - Test with various email formats and edge cases

---

## 🚀 Advanced Features (Future)

Potential enhancements:
- **Attachment handling** - Save email attachments to tasks
- **Board selection** - Specify board in email subject (e.g., `@BoardName`)
- **Assignee selection** - Mention users to assign (e.g., `@john`)
- **Due dates** - Parse dates from email body
- **Reply to update** - Reply to task notification emails to add comments

---

## 📞 Support

- **Maileroo Docs:** [Maileroo inbound documentation](https://maileroo.com/docs/inbound)
- **Maileroo Support:** [support@maileroo.com](mailto:support@maileroo.com)
- **Project Issues:** Create an issue in your repository

---

## ✅ Checklist

Before going live, ensure:
- [ ] Domain verified in Maileroo
- [ ] Inbound route configured
- [ ] Webhook URL is publicly accessible (HTTPS)
- [ ] Environment variables set
- [ ] Test email sent and task created
- [ ] Server logs show successful processing
- [ ] Users are registered and have board access

---

**You're all set!** Users can now create tasks by sending emails to your dedicated address. 🎉
