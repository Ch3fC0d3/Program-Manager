# HTTPS Setup Guide for Local Development

This guide will help you enable HTTPS for your local development environment.

## 🎯 **Why HTTPS for Local Development?**

- Test security features (HSTS, Secure cookies)
- Match production environment
- Test PWA features
- Avoid mixed content warnings
- Required for some browser APIs

## 📋 **Prerequisites**

You need one of these tools to generate SSL certificates:

### **Option 1: mkcert (Recommended - Easiest)**
```powershell
# Install via Chocolatey
choco install mkcert

# Or download from: https://github.com/FiloSottile/mkcert/releases
```

### **Option 2: OpenSSL**
```powershell
# Install via Chocolatey
choco install openssl

# Or download from: https://slproweb.com/products/Win32OpenSSL.html
```

## 🚀 **Quick Setup**

### **Method 1: Using mkcert (Easiest)**

```powershell
# 1. Install mkcert
choco install mkcert

# 2. Install local CA
mkcert -install

# 3. Create certs directory
mkdir certs

# 4. Generate certificates
mkcert -key-file certs/localhost-key.pem -cert-file certs/localhost.pem localhost 127.0.0.1 ::1

# 5. Start HTTPS dev server
npm run dev:https
```

### **Method 2: Using OpenSSL**

```powershell
# 1. Run the SSL certificate generator script
.\scripts\generate-ssl-cert.ps1

# 2. Trust the certificate (see instructions below)

# 3. Start HTTPS dev server
npm run dev:https
```

## 🔐 **Trust the Certificate**

### **For Chrome/Edge:**
1. Open `chrome://settings/certificates`
2. Go to "Authorities" tab
3. Click "Import"
4. Select `certs/localhost.pem`
5. Check "Trust this certificate for identifying websites"
6. Click OK

### **For Firefox:**
1. Open `about:preferences#privacy`
2. Scroll to "Certificates"
3. Click "View Certificates"
4. Go to "Authorities" tab
5. Click "Import"
6. Select `certs/localhost.pem`
7. Check "Trust this CA to identify websites"
8. Click OK

### **For Windows (System-wide):**
1. Double-click `certs/localhost.pem`
2. Click "Install Certificate"
3. Select "Local Machine"
4. Choose "Place all certificates in the following store"
5. Browse to "Trusted Root Certification Authorities"
6. Click Next → Finish

## 🎮 **Usage**

### **Start HTTPS Development Server:**
```powershell
npm run dev:https
```

### **Access Your App:**
```
https://localhost:3000
```

### **Start Regular HTTP Server:**
```powershell
npm run dev
```

## 📁 **Files Created**

- `/server.js` - Custom HTTPS server for Next.js
- `/certs/localhost.pem` - SSL certificate (gitignored)
- `/certs/localhost-key.pem` - Private key (gitignored)
- `/scripts/generate-ssl-cert.ps1` - Certificate generator script

## ⚙️ **Configuration**

### **Change Port:**
Edit `server.js`:
```javascript
const port = process.env.PORT || 3000
```

Or set environment variable:
```powershell
$env:PORT=3001; npm run dev:https
```

### **Update NextAuth for HTTPS:**
In `.env`:
```env
NEXTAUTH_URL="https://localhost:3000"
```

### **Update Security Headers:**
The security headers in `next.config.js` are already configured for HTTPS.

## 🔧 **Troubleshooting**

### **Certificate Not Trusted:**
- Make sure you imported the certificate correctly
- Restart your browser after importing
- Try using mkcert instead of OpenSSL

### **Port Already in Use:**
```powershell
# Find process using port 3000
netstat -ano | findstr :3000

# Kill the process (replace PID)
taskkill /PID <PID> /F
```

### **"Cannot find module 'https'":**
This is a Node.js built-in module. Make sure you're running Node.js 14+.

### **EPERM Error:**
Stop the dev server before regenerating certificates:
```powershell
Get-Process -Name node -ErrorAction SilentlyContinue | Stop-Process -Force
```

## 🌐 **Production Deployment**

For production, use a proper SSL certificate from:
- **Let's Encrypt** (Free)
- **Cloudflare** (Free with proxy)
- **Your hosting provider** (Vercel, Netlify, etc.)

**DO NOT** use self-signed certificates in production!

## 📝 **Environment Variables for Production**

```env
# Production HTTPS URL
NEXTAUTH_URL="https://yourdomain.com"

# Ensure these are set
NODE_ENV="production"
```

## 🔒 **Security Notes**

1. **Never commit certificates to git** - Already in `.gitignore`
2. **Regenerate certificates periodically** - They expire after 365 days
3. **Use different certificates for production** - Self-signed certs are for dev only
4. **Keep private keys secure** - Never share `localhost-key.pem`

## 📚 **Additional Resources**

- [mkcert Documentation](https://github.com/FiloSottile/mkcert)
- [Next.js Custom Server](https://nextjs.org/docs/advanced-features/custom-server)
- [Let's Encrypt](https://letsencrypt.org/)
- [MDN: Transport Layer Security](https://developer.mozilla.org/en-US/docs/Web/Security/Transport_Layer_Security)

## ✅ **Verification**

After setup, verify HTTPS is working:

1. Visit `https://localhost:3000`
2. Check for 🔒 icon in browser address bar
3. Click the lock icon → Certificate should show "localhost"
4. Open DevTools → Security tab → Should show "Secure connection"

---

**Need help?** Check the troubleshooting section or review the security documentation in `/SECURITY.md`.
