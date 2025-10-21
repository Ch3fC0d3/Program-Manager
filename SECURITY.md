# Security Guidelines

This document outlines security best practices and configurations for the project management application.

## 🔐 **Environment Variables**

### **Critical Security Requirements**

1. **NEVER commit `.env` files to version control**
   - The `.env` file is already in `.gitignore`
   - Always use `.env.example` as a template with placeholder values

2. **Rotate all API keys immediately if exposed**
   - Supabase keys
   - OpenAI API key
   - SMTP credentials
   - NextAuth secret

3. **Generate strong secrets**
   ```bash
   # Generate NEXTAUTH_SECRET
   node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
   ```

### **Required Environment Variables**

- `DATABASE_URL` - Supabase pooled connection (for app)
- `DIRECT_URL` - Supabase direct connection (for migrations)
- `NEXTAUTH_SECRET` - **MUST be strong random string (32+ chars)**
- `EMAIL_FROM` - **MUST be set for email functionality**

## 🛡️ **Authentication & Authorization**

### **Role-Based Access Control (RBAC)**

The application implements role-based access control with four roles:

- **ADMIN** - Full system access, can create users
- **MANAGER** - Can manage boards and teams
- **MEMBER** - Standard user access
- **VIEWER** - Read-only access

### **Protected Endpoints**

All API endpoints require authentication. Additional role checks:

- `/api/users` (POST) - Requires ADMIN role
- `/api/boards/[id]/members` (POST/DELETE) - Requires ADMIN or OWNER board role

### **Board-Level Access Control**

Users can only access boards they are members of. The API verifies:
1. User is authenticated
2. User is a member of the requested board
3. User has appropriate role for the action

## 🔒 **Input Validation**

All user input is validated using Zod schemas before processing:

- **Task creation** - Title length, description size, valid IDs
- **User creation** - Email format, password strength
- **Contact creation** - Field lengths, email validation
- **File uploads** - File size limits (10MB), MIME type validation

See `/lib/validation.ts` for all validation schemas.

## 🚨 **Security Headers**

The application sets comprehensive security headers (see `next.config.js`):

- **Content-Security-Policy** - Prevents XSS attacks
- **Strict-Transport-Security** - Enforces HTTPS
- **X-Frame-Options** - Prevents clickjacking
- **X-Content-Type-Options** - Prevents MIME sniffing
- **Referrer-Policy** - Controls referrer information
- **Permissions-Policy** - Restricts browser features

## 📊 **Database Security**

### **Transactions**

Critical multi-step operations use database transactions:
- Contact + Vendor creation (AI classifier)
- Ensures data consistency and prevents partial updates

### **Soft Deletes**

Most models use `deletedAt` field for soft deletes:
- Preserves data for audit trails
- Allows recovery of accidentally deleted items

### **Indexes**

Database indexes are configured for:
- Frequently queried fields
- Foreign keys
- Composite queries (e.g., `boardId + status + position`)

## 🔑 **API Security Best Practices**

### **Rate Limiting** (Recommended Implementation)

Install rate limiting middleware:
```bash
npm install express-rate-limit
```

Implement in API routes:
```typescript
import rateLimit from 'express-rate-limit'

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
})
```

### **CSRF Protection**

NextAuth provides CSRF protection for authentication endpoints. For additional API endpoints, consider implementing CSRF tokens.

### **SQL Injection Protection**

Prisma ORM provides automatic SQL injection protection through parameterized queries. **Never use raw SQL queries** unless absolutely necessary.

## 📁 **File Upload Security**

### **Current Limits**
- Max file size: 10MB (`MAX_FILE_SIZE` in `.env`)
- Upload directory: `./public/uploads`

### **Recommended Enhancements**

1. **File type validation** - Whitelist allowed MIME types
2. **Virus scanning** - Integrate malware scanning
3. **Secure storage** - Use randomized filenames
4. **Access control** - Verify user permissions before serving files

## 🔍 **Logging & Monitoring**

### **Current Logging**
- Console logging for errors
- Activity logs in database

### **Recommended Additions**
- Structured logging (e.g., Winston, Pino)
- Error tracking (e.g., Sentry)
- Security event monitoring
- Failed login attempt tracking

## 🚀 **Production Deployment Checklist**

Before deploying to production:

- [ ] Rotate all API keys and secrets
- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Configure `EMAIL_FROM` properly
- [ ] Enable HTTPS (required for HSTS header)
- [ ] Set up rate limiting
- [ ] Configure database backups
- [ ] Set up error monitoring (Sentry, etc.)
- [ ] Review and tighten CSP headers
- [ ] Enable database connection pooling
- [ ] Set up logging infrastructure
- [ ] Configure CORS if needed
- [ ] Review file upload security
- [ ] Test authentication flows
- [ ] Verify RBAC permissions

## 📝 **Reporting Security Issues**

If you discover a security vulnerability:

1. **DO NOT** open a public issue
2. Email security concerns to: [your-security-email@domain.com]
3. Include detailed description and reproduction steps
4. Allow reasonable time for fix before public disclosure

## 🔄 **Regular Security Maintenance**

- Update dependencies monthly: `npm audit fix`
- Review security advisories: `npm audit`
- Rotate API keys quarterly
- Review access logs for suspicious activity
- Update security headers as needed
- Review and update RBAC permissions

## 📚 **Additional Resources**

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security Best Practices](https://nextjs.org/docs/advanced-features/security-headers)
- [Prisma Security](https://www.prisma.io/docs/guides/database/advanced-database-tasks/sql-injection)
- [NextAuth.js Security](https://next-auth.js.org/configuration/options#security)
