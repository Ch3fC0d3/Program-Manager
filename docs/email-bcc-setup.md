# Email BCC Monitoring Setup

## Overview
The application automatically sends a BCC (blind carbon copy) of every email to a monitoring address for record-keeping and debugging.

## Current Configuration

### Default BCC Address
- **Hardcoded Default:** `gabriel@pellegrini.us`
- **Environment Variable:** `EMAIL_BCC_MONITOR` (overrides default)

### How It Works
Every email sent through the `sendEmail()` function in `lib/email.ts` automatically includes the monitoring email in the BCC field.

```typescript
// From lib/email.ts (lines 51-57)
const monitoringEmail = process.env.EMAIL_BCC_MONITOR || 'gabriel@pellegrini.us'
const bccList = options.bcc 
  ? Array.isArray(options.bcc) 
    ? [...options.bcc, monitoringEmail]
    : [options.bcc, monitoringEmail]
  : [monitoringEmail]
```

---

## Setup Instructions

### Local Development (.env.local)

Add this to your `.env.local` file:

```bash
# Email BCC Monitoring - receives copy of all outgoing emails
EMAIL_BCC_MONITOR=your-email@domain.com
```

### Vercel Deployment

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** > **Environment Variables**
4. Add new variable:
   - **Name:** `EMAIL_BCC_MONITOR`
   - **Value:** `your-email@domain.com`
   - **Environment:** Production, Preview, Development (select all)
5. Click **Save**
6. Redeploy your application for changes to take effect

### Other Platforms (Railway, Render, etc.)

Add the environment variable in your platform's settings:
```
EMAIL_BCC_MONITOR=your-email@domain.com
```

---

## Troubleshooting

### Not Receiving BCC Copies?

#### 1. Check Spam/Junk Folder
- BCC emails might be filtered as spam
- Add your app's sending address to your contacts/safe senders

#### 2. Verify Environment Variable
Run this in your deployed environment:
```bash
echo $EMAIL_BCC_MONITOR
```

Or check the Vercel logs for the BCC confirmation:
```
Email sent successfully: <message-id> (BCC: your-email@domain.com)
```

#### 3. Check SMTP Configuration
Ensure these environment variables are set:
- `MAILEROO_SMTP_HOST`
- `MAILEROO_SMTP_PORT`
- `MAILEROO_SMTP_USER`
- `MAILEROO_SMTP_PASSWORD`
- `EMAIL_FROM`

#### 4. Test Email Sending
Use the API endpoint to test:
```bash
POST /api/email/send
{
  "to": "test@example.com",
  "subject": "Test Email",
  "html": "<p>Testing BCC functionality</p>"
}
```

Check the server logs for:
```
Email sent successfully: <message-id> (BCC: your-email@domain.com)
```

#### 5. Verify Email Provider Settings
- Some email providers block BCC from external sources
- Check your email provider's security settings
- Ensure the sending domain is not blacklisted

---

## Email Types That Include BCC

All emails sent through the system include BCC:

- ✅ Welcome emails (new user creation)
- ✅ Task assignment notifications
- ✅ Task status change notifications
- ✅ Comment notifications
- ✅ Board member added notifications
- ✅ Task due soon reminders
- ✅ Password reset notifications
- ✅ Custom emails via `/api/email/send`

---

## Security Notes

⚠️ **Important:**
- The BCC address receives copies of ALL emails
- Do not use a shared or public email address
- Ensure the monitoring email is secure and access-controlled
- Consider using a dedicated monitoring inbox
- Regularly archive or delete old emails to manage storage

---

## Changing the BCC Address

### Temporary Change (Environment Variable)
Set `EMAIL_BCC_MONITOR` in your environment

### Permanent Change (Code)
Edit `lib/email.ts` line 52:
```typescript
const monitoringEmail = process.env.EMAIL_BCC_MONITOR || 'new-email@domain.com'
```

---

## Multiple BCC Recipients

To add multiple BCC recipients, modify `lib/email.ts`:

```typescript
// Current (single monitoring email)
const monitoringEmail = process.env.EMAIL_BCC_MONITOR || 'gabriel@pellegrini.us'

// Multiple recipients
const monitoringEmails = [
  process.env.EMAIL_BCC_MONITOR || 'gabriel@pellegrini.us',
  'admin@company.com',
  'compliance@company.com'
]

const bccList = options.bcc 
  ? Array.isArray(options.bcc) 
    ? [...options.bcc, ...monitoringEmails]
    : [options.bcc, ...monitoringEmails]
  : monitoringEmails
```

---

## Disabling BCC (Not Recommended)

If you need to disable BCC monitoring:

1. Set environment variable to empty string:
   ```bash
   EMAIL_BCC_MONITOR=""
   ```

2. Or modify `lib/email.ts` to skip BCC:
   ```typescript
   // Comment out or remove the BCC logic
   const info = await transporter.sendMail({
     from,
     to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
     // bcc: bccList.join(', '), // Disabled
     subject: options.subject,
     html: options.html,
     text: options.text,
   })
   ```

⚠️ **Warning:** Disabling BCC removes your audit trail and makes debugging email issues difficult.
