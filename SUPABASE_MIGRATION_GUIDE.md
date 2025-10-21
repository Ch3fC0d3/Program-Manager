# Supabase Migration Guide

Quick reference for setting up Prisma with Supabase's pooled connections.

## Why Two URLs?

- **DATABASE_URL** (pooled): Fast queries through PgBouncer for your app
- **DIRECT_URL** (direct): Required for schema migrations (PgBouncer doesn't support migrations)

## Setup Steps

### 1. Get Your Connection Strings

Go to Supabase Dashboard → Settings → Database → Connection string → URI tab

**For DATABASE_URL (pooled):**
- Toggle "Use connection pooling" **ON**
- Copy the string

**For DIRECT_URL (direct):**
- Toggle "Use connection pooling" **OFF**  
- Copy the string

### 2. Update Your `.env`

```env
# Pooled connection (for app queries)
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@db.fegstrmxiitzwldmrowm.supabase.co:5432/postgres?pgbouncer=true&connection_limit=1"

# Direct connection (for migrations)
DIRECT_URL="postgresql://postgres:YOUR_PASSWORD@db.fegstrmxiitzwldmrowm.supabase.co:5432/postgres"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-generated-secret"

# File Upload
UPLOAD_DIR="./public/uploads"
MAX_FILE_SIZE=10485760
```

**Important:** Replace `YOUR_PASSWORD` with your actual database password (URL-encode special characters like `@` → `%40`)

### 3. Update `prisma/schema.prisma`

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")  // ← Add this line
}
```

### 4. Run Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Create and apply migration
npx prisma migrate dev --name init

# Or for production/CI
npx prisma migrate deploy
```

## Common Issues

### Password Special Characters

If your password contains `@`, `#`, `&`, etc., URL-encode them:
- `@` → `%40`
- `#` → `%23`
- `&` → `%26`
- `%` → `%25`

Example:
```
Password: my@pass#123
Encoded:  my%40pass%23123
```

### Migration Errors

If you see "prepared statement already exists" or similar:
- Make sure `DIRECT_URL` is set (no PgBouncer)
- Check that `directUrl` is in your schema.prisma

### Connection Limit

The `connection_limit=1` in DATABASE_URL is recommended for serverless environments (Vercel, Netlify) to prevent connection pool exhaustion.

## Verification

Test your setup:

```bash
# Check database connection
npx prisma db pull

# View database in browser
npx prisma studio
```

## Resources

- [Prisma + Supabase Guide](https://www.prisma.io/docs/guides/database/supabase)
- [Supabase Connection Pooling](https://supabase.com/docs/guides/database/connecting-to-postgres#connection-pooler)
