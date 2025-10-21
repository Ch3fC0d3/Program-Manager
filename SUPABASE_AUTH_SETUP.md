# Supabase Auth Integration Guide

This guide shows how to integrate Supabase Auth with your existing NextAuth setup.

## Overview

The trigger automatically creates a user in your `User` table whenever someone signs up through Supabase Auth (email/password, OAuth, magic links, etc.).

## Setup Steps

### 1. Update Prisma Schema (Already Done)

The `User` model now includes:
- `authId` - Links to Supabase Auth user UUID
- `password` - Now optional (null for OAuth users)

### 2. Run Prisma Migration

```bash
npx prisma migrate dev --name add_auth_id
```

### 3. Apply Supabase Trigger

Go to your Supabase Dashboard → SQL Editor and run:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User"(id, "authId", email, name, password, role, "createdAt", "updatedAt")
  values (
    gen_random_uuid()::text,
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    null,
    'MEMBER',
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional: Sync user updates
create or replace function public.handle_user_update()
returns trigger as $$
begin
  update public."User"
  set
    email = new.email,
    name = coalesce(new.raw_user_meta_data->>'name', name),
    "updatedAt" = now()
  where "authId" = new.id::text;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_updated on auth.users;
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();
```

### 4. Install Supabase Client (Optional)

If you want to use Supabase Auth instead of NextAuth:

```bash
npm install @supabase/supabase-js @supabase/auth-helpers-nextjs
```

### 5. Add Supabase Keys to .env

Get these from Supabase Dashboard → Settings → API:

```env
# Existing database URLs
DATABASE_URL="postgresql://..."
DIRECT_URL="postgresql://..."

# Supabase Auth (add these)
NEXT_PUBLIC_SUPABASE_URL="https://fegstrmxiitzwldmrowm.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

# NextAuth (keep existing)
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-secret"
```

## How It Works

### User Creation Flow

1. User signs up via Supabase Auth (email, Google, GitHub, etc.)
2. Supabase creates entry in `auth.users` table
3. Trigger fires and creates matching entry in `public.User` table
4. Your app can now use the user with all relations (tasks, boards, etc.)

### Fields Mapping

| Supabase Auth | Your User Table |
|---------------|-----------------|
| `id` (UUID) | `authId` |
| `email` | `email` |
| `raw_user_meta_data->>'name'` | `name` |
| - | `password` = null |
| - | `role` = 'MEMBER' |

## Testing

### Test the Trigger

1. Go to Supabase Dashboard → Authentication → Users
2. Click "Add user" → "Create new user"
3. Enter email and password
4. Check your `User` table - should see new entry with `authId` populated

### Verify in SQL Editor

```sql
-- Check if trigger exists
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';

-- View recent users
SELECT id, "authId", email, name, role FROM "User" ORDER BY "createdAt" DESC LIMIT 5;

-- Check auth users
SELECT id, email, created_at FROM auth.users ORDER BY created_at DESC LIMIT 5;
```

## Migration Options

### Option A: Keep NextAuth + Add Supabase Auth

- Existing users continue using NextAuth (email/password)
- New users can use Supabase Auth (OAuth, magic links)
- Both work side-by-side

### Option B: Migrate to Supabase Auth Only

1. Export existing users
2. Import to Supabase Auth
3. Update `authId` for migrated users
4. Remove NextAuth

## Troubleshooting

### Trigger Not Firing

Check if trigger exists:
```sql
SELECT * FROM pg_trigger WHERE tgname = 'on_auth_user_created';
```

### Duplicate Email Error

If a user with that email already exists in `public.User`:
```sql
-- Option 1: Link existing user to auth
UPDATE "User" SET "authId" = 'auth-user-uuid' WHERE email = 'user@example.com';

-- Option 2: Delete and let trigger recreate
DELETE FROM "User" WHERE email = 'user@example.com';
-- Then sign up again
```

### Name Not Showing

Make sure to pass `name` in metadata when signing up:
```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password',
  options: {
    data: {
      name: 'John Doe'  // ← This becomes raw_user_meta_data
    }
  }
})
```

## Security Notes

- Trigger runs with `security definer` (elevated privileges)
- Only creates users, doesn't expose sensitive auth data
- `password` field is null for OAuth users (secure)
- Consider adding RLS policies if exposing User table via Supabase API

## Next Steps

1. **Enable OAuth providers** in Supabase Dashboard → Authentication → Providers
2. **Configure email templates** for magic links and password resets
3. **Add RLS policies** if using Supabase client directly
4. **Update your login flow** to use Supabase Auth

## Resources

- [Supabase Auth Docs](https://supabase.com/docs/guides/auth)
- [Database Triggers](https://supabase.com/docs/guides/database/postgres/triggers)
- [Auth Helpers for Next.js](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
