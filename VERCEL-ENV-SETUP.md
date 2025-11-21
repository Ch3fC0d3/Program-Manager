# 🚀 VERCEL ENVIRONMENT VARIABLES - QUICK SETUP

## ⚡ **Copy & Paste These Into Vercel**

Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**

---

### **Option 1: SSL/TLS Port 465 (RECOMMENDED)**

| Variable Name | Value |
|---------------|-------|
| `EMAIL_HOST` | `myfreshshare.com` |
| `EMAIL_PORT` | `465` |
| `EMAIL_SECURE` | `true` |
| `EMAIL_USER` | `admin@myfreshshare.com` |
| `EMAIL_PASSWORD` | *(your actual password)* |
| `EMAIL_FROM` | `admin@myfreshshare.com` |
| `EMAIL_BCC_MONITOR` | `gabriel@pellegrini.us` |

---

### **Option 2: STARTTLS Port 587 (ALTERNATIVE)**

| Variable Name | Value |
|---------------|-------|
| `EMAIL_HOST` | `mail.myfreshshare.com` |
| `EMAIL_PORT` | `587` |
| `EMAIL_SECURE` | `false` |
| `EMAIL_USER` | `admin@myfreshshare.com` |
| `EMAIL_PASSWORD` | *(your actual password)* |
| `EMAIL_FROM` | `admin@myfreshshare.com` |
| `EMAIL_BCC_MONITOR` | `gabriel@pellegrini.us` |

---

## 📋 **Step-by-Step:**

1. ✅ Go to [https://vercel.com/dashboard](https://vercel.com/dashboard)
2. ✅ Click on **program-manager** project
3. ✅ Click **Settings** tab
4. ✅ Click **Environment Variables** in left sidebar
5. ✅ For each row in the table above:
   - Click **Add New**
   - Enter the **Variable Name** (e.g., `EMAIL_HOST`)
   - Enter the **Value** (e.g., `myfreshshare.com`)
   - Select **Production, Preview, Development** (all three)
   - Click **Save**
6. ✅ After adding all 7 variables, go to **Deployments** tab
7. ✅ Click the **three dots** on the latest deployment
8. ✅ Click **Redeploy**
9. ✅ Wait for deployment to complete (~2 minutes)

---

## ✅ **Test After Deployment:**

1. **Create a test user:**
   - Log in as admin
   - Go to Settings → User Management
   - Click "Create New User"
   - Enter test email
   - Check if welcome email arrives

2. **Check logs:**
   - Go to Vercel Dashboard → Deployments
   - Click latest deployment
   - Click "View Function Logs"
   - Look for "Email sent successfully" message

---

## 🔍 **Troubleshooting:**

### **If emails still don't send:**

1. **Check Vercel logs** for error messages
2. **Verify password** - try logging into webmail with same credentials
3. **Try port 587** if port 465 doesn't work (or vice versa)
4. **Contact hosting provider** - ask if SMTP is enabled and if Vercel IPs need to be whitelisted

### **If emails go to spam:**

- Add SPF record to your domain DNS
- Set up DKIM authentication
- Use a real email address (not noreply@)

---

## 📞 **Need Help?**

Check the full documentation: `docs/EMAIL-SETUP.md`

---

**Last Updated:** November 12, 2025
