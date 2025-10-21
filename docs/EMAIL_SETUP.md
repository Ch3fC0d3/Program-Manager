# Email Integration with Maileroo

This project uses **Maileroo** for sending transactional emails via SMTP.

## Setup Instructions

### 1. Create a Maileroo Account

1. Go to [https://maileroo.com](https://maileroo.com)
2. Sign up for a free account
3. Verify your email address

### 2. Get SMTP Credentials

1. Log in to your Maileroo dashboard
2. Navigate to **SMTP** section
3. Copy your SMTP credentials:
   - SMTP Host: `smtp.maileroo.com`
   - SMTP Port: `587` (TLS)
   - SMTP Username: Your unique username
   - SMTP Password: Your password

### 3. Configure Environment Variables

Add the following to your `.env.local` file:

```env
# Email - Maileroo SMTP Configuration
MAILEROO_SMTP_HOST="smtp.maileroo.com"
MAILEROO_SMTP_PORT="587"
MAILEROO_SMTP_USER="your-smtp-username-here"
MAILEROO_SMTP_PASSWORD="your-smtp-password-here"
EMAIL_FROM="noreply@yourdomain.com"
NEXTAUTH_URL="http://localhost:3000"  # Change in production
```

### 4. Verify Domain (Production Only)

For production use:

1. Add your domain in Maileroo dashboard
2. Add the required DNS records (SPF, DKIM, DMARC)
3. Wait for verification (usually a few minutes)
4. Update `EMAIL_FROM` with your verified domain email

## Email Templates

All transactional templates live in `lib/email/templates/` so you can iterate on HTML and plain-text output without touching transport logic. Import helpers from `emailTemplates` or call individual builders directly when composing custom emails.

The system includes pre-built email templates for:

### 1. Task Assigned

Sent when a task is assigned to a user.

```typescript
emailTemplates.taskAssigned({
  taskTitle: "Fix login bug",
  taskId: "task_123",
  assignedBy: "John Doe",
  taskUrl: "https://yourdomain.com/tasks/task_123",
  description: "Investigate failed login attempts",
  priority: "HIGH",
  status: "IN_PROGRESS",
  dueDate: "Oct 28, 2025"
})
```

### 2. Task Due Soon

Reminder sent when a task is approaching its due date.

```typescript
emailTemplates.taskDueSoon({
  taskTitle: "Complete report",
  taskId: "task_456",
  dueDate: "Oct 25, 2025",
  taskUrl: "https://yourdomain.com/tasks/task_456"
})
```

### 3. Comment Added

Notification when someone comments on a task.

```typescript
emailTemplates.commentAdded({
  taskTitle: "Design review",
  taskId: "task_789",
  commenterName: "Jane Smith",
  commentText: "Looks great! Just a few minor changes...",
  taskUrl: "https://yourdomain.com/tasks/task_789"
})
```

### 4. Task Status Changed

Notification when task status is updated.

```typescript
emailTemplates.taskStatusChanged({
  taskTitle: "API Integration",
  taskId: "task_101",
  oldStatus: "IN_PROGRESS",
  newStatus: "DONE",
  changedBy: "Bob Johnson",
  taskUrl: "https://yourdomain.com/tasks/task_101"
})
```

### 5. Welcome Email

Sent to new users.

```typescript
emailTemplates.welcomeEmail({
  userName: "Alice",
  loginUrl: "https://yourdomain.com/login"
})
```

## Usage

### Sending Emails Programmatically

```typescript
import { sendEmail, emailTemplates } from '@/lib/email'

// Send a task assignment email
const emailContent = emailTemplates.taskAssigned({
  taskTitle: "Fix bug #123",
  taskId: "task_abc",
  assignedBy: "Manager",
  taskUrl: "https://app.com/tasks/task_abc"
})

await sendEmail({
  to: "user@example.com",
  subject: emailContent.subject,
  html: emailContent.html,
  text: emailContent.text
})
```

### Sending Custom Emails

```typescript
import { sendEmail } from '@/lib/email'

await sendEmail({
  to: "user@example.com",
  subject: "Custom Subject",
  html: "<h1>Hello!</h1><p>This is a custom email.</p>",
  text: "Hello! This is a custom email."
})
```

### Sending to Multiple Recipients

```typescript
await sendEmail({
  to: ["user1@example.com", "user2@example.com"],
  subject: "Team Update",
  html: "<p>Important team announcement...</p>"
})
```

## Current Integrations

### Outbound Emails (Sending)

Email notifications are automatically sent for:

- **Task Assignment** – When a task is assigned to a user
  - **Triggers:** Creating a task with an assignee
  - **Template:** `taskAssigned`
  - **Recipients:** Assigned user

### Inbound Emails (Receiving)

- **Email-to-Task** – Create tasks by sending emails (new)
  - **Send email to:** `tasks@yourdomain.com`
  - **Creates:** Task in your default board automatically
  - **Priority keywords:** `[URGENT]`, `[HIGH]`, `[LOW]`
  - **Hashtags for tags:** `#bug`, `#feature`
  - **Setup guide:** See [MAILEROO_INBOUND_SETUP.md](./MAILEROO_INBOUND_SETUP.md)

### Coming Soon

- **Comment Notifications** – When someone comments on your task
- **Status Change Alerts** – When task status changes
- **Due Date Reminders** – Automated reminders for upcoming tasks
- **Daily Digest** – Summary of tasks and activities

## Testing

### Test Email Sending (Development)

1. Make sure your `.env.local` has valid Maileroo credentials
2. Create a test task and assign it to a user with a valid email
3. Check the terminal logs for email send confirmation
4. Check the recipient's inbox

### API Endpoint

You can also test via the API endpoint:

```bash
POST /api/email/send
Content-Type: application/json
Authorization: Bearer <your-session-token>

{
  "to": "test@example.com",
  "subject": "Test Email",
  "html": "<h1>Test</h1><p>This is a test email.</p>",
  "text": "Test - This is a test email."
}
```

## Troubleshooting

### Emails Not Sending

1. **Check environment variables** - Ensure all SMTP credentials are correct
2. **Check terminal logs** - Look for error messages
3. **Verify Maileroo account** - Ensure your account is active
4. **Check spam folder** - Emails might be filtered

### Common Errors

#### Error: "Invalid login"

- Double-check your SMTP username and password
- Regenerate credentials in Maileroo dashboard

#### Error: "Connection timeout"

- Check your firewall settings
- Ensure port 587 is not blocked

#### Error: "Sender not verified"

- In production, verify your domain in Maileroo
- In development, use Maileroo's test email addresses

## Maileroo Features

- **Free Tier:** 300 emails/month
- **Paid Plans:** Starting at $10/month for 10,000 emails
- **Deliverability:** High inbox placement rates
- **Analytics:** Track opens, clicks, bounces
- **Templates:** Visual email template builder
- **API:** REST API for advanced integrations

## Best Practices

1. **Use templates** - Maintain consistent branding
2. **Include plain text** - Always provide text alternative
3. **Test thoroughly** - Send test emails before production
4. **Monitor delivery** - Check Maileroo analytics
5. **Handle failures** - Email failures shouldn't break your app
6. **Respect privacy** - Include unsubscribe options
7. **Rate limiting** - Don't spam users with too many emails

## Support

- **Maileroo Docs:** [Maileroo documentation](https://maileroo.com/docs)
- **Maileroo Support:** [support@maileroo.com](mailto:support@maileroo.com)
- **Project Issues:** Create an issue in your repository
