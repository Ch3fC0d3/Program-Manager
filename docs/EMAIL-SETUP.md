# 📧 Email Configuration Guide

## Current Setup: myfreshshare.com SMTP

This application is configured to send emails using your custom domain email server.

---

## 🔧 Environment Variables

Add these to your Vercel project (Settings → Environment Variables):

### **Option 1: Secure SSL/TLS (Port 465) - RECOMMENDED**

```bash
EMAIL_HOST=myfreshshare.com
EMAIL_PORT=465
EMAIL_SECURE=true
EMAIL_USER=admin@myfreshshare.com
EMAIL_PASSWORD=your-actual-password
EMAIL_FROM=admin@myfreshshare.com
EMAIL_BCC_MONITOR=gabriel@pellegrini.us
```

### **Option 2: STARTTLS (Port 587) - Alternative**

```bash
EMAIL_HOST=mail.myfreshshare.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=admin@myfreshshare.com
EMAIL_PASSWORD=your-actual-password
EMAIL_FROM=admin@myfreshshare.com
EMAIL_BCC_MONITOR=gabriel@pellegrini.us
```

---

## 📝 Setup Instructions

### **1. Add Variables to Vercel**

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Navigate to **Settings** → **Environment Variables**
4. Add each variable listed above
5. Click **Save**

### **2. Redeploy Application**

After adding the variables:
1. Go to **Deployments** tab
2. Click the three dots on the latest deployment
3. Select **Redeploy**

OR push a new commit to trigger automatic deployment.

---

## 🧪 Testing Email Configuration

After deployment, test the email functionality:

### **Test 1: Create New User**
1. Go to Settings → User Management (Admin only)
2. Click "Create New User"
3. Fill in details and submit
4. Check if welcome email is received
5. Check if BCC copy arrives at monitoring email

### **Test 2: Forgot Password**
1. Log out
2. Click "Forgot your password?" on login page
3. Enter email address
4. Check if password reset email is received

### **Test 3: Resend Welcome Email**
1. Go to Settings → User Management
2. Find a user
3. Click "Resend Email"
4. Check if email is received

---

## 📊 Email Types Sent

The application automatically sends these emails:

| Email Type | Trigger | Recipient |
|------------|---------|-----------|
| **Welcome Email** | New user created | New user |
| **Password Reset** | Forgot password request | Requesting user |
| **Resend Welcome** | Admin resends credentials | Selected user |
| **Task Assignment** | Task assigned to user | Assigned user |
| **Task Due Soon** | Task due date approaching | Assigned user |
| **Comment Added** | Comment on user's task | Task assignee |
| **Board Member Added** | Added to board | New board member |

All emails automatically BCC to the monitoring email address.

---

## 🔒 Security Best Practices

1. **Never commit passwords** - Only store in Vercel environment variables
2. **Use strong passwords** - For the email account
3. **Enable 2FA** - On your email account if possible
4. **Monitor BCC emails** - Check the monitoring inbox regularly
5. **Use dedicated email** - Consider `noreply@myfreshshare.com` instead of admin

---

## 🆘 Troubleshooting

### **Emails Not Sending**

1. **Check Vercel Logs:**
   - Go to Deployments → Click deployment → View Function Logs
   - Look for email errors

2. **Verify Credentials:**
   - Double-check EMAIL_USER and EMAIL_PASSWORD
   - Test login at your email provider's webmail

3. **Check Port:**
   - Port 465 requires `EMAIL_SECURE=true`
   - Port 587 requires `EMAIL_SECURE=false`

4. **Firewall Issues:**
   - Ensure Vercel's IPs aren't blocked by your email server
   - Check with your hosting provider

### **Emails Going to Spam**

1. **SPF Record:** Add Vercel's IPs to your domain's SPF record
2. **DKIM:** Set up DKIM authentication
3. **DMARC:** Configure DMARC policy
4. **From Address:** Use a real email address, not noreply@

### **BCC Not Working**

- Check `EMAIL_BCC_MONITOR` is set correctly
- Verify the monitoring email address exists
- Check spam folder

---

## 🔄 Switching Email Providers

To switch to a different email provider (Gmail, SendGrid, AWS SES, etc.):

1. Update the environment variables with new credentials
2. Redeploy the application
3. No code changes needed!

### **Example: Gmail**

```bash
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
EMAIL_BCC_MONITOR=gabriel@pellegrini.us
```

### **Example: SendGrid**

```bash
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
EMAIL_FROM=noreply@yourdomain.com
EMAIL_BCC_MONITOR=gabriel@pellegrini.us
```

---

## 📞 Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables are set
3. Test SMTP credentials with a mail client
4. Contact your email hosting provider

---

**Last Updated:** November 12, 2025
