-- ============================================
-- Supabase Auth Integration Setup
-- ============================================
-- Run this in Supabase Dashboard → SQL Editor
-- This creates triggers to auto-sync auth.users to public.User

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- FUNCTION: Create User on Auth Signup
-- ============================================
create or replace function public.handle_new_user()
returns trigger as $$
begin
  -- Insert new user into public.User table
  insert into public."User"(
    id,
    "authId",
    email,
    name,
    password,
    role,
    "createdAt",
    "updatedAt"
  )
  values (
    gen_random_uuid()::text,                                              -- Generate new UUID for User.id
    new.id::text,                                                         -- Link to auth.users.id
    new.email,                                                            -- Copy email
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)), -- Use metadata name or email prefix
    null,                                                                 -- No password (OAuth users)
    'MEMBER',                                                             -- Default role
    now(),
    now()
  );
  
  return new;
exception
  when unique_violation then
    -- If user already exists (duplicate email), update authId instead
    update public."User"
    set "authId" = new.id::text,
        "updatedAt" = now()
    where email = new.email;
    return new;
end;
$$ language plpgsql security definer;

-- ============================================
-- TRIGGER: On Auth User Created
-- ============================================
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================
-- FUNCTION: Update User on Auth Update
-- ============================================
create or replace function public.handle_user_update()
returns trigger as $$
begin
  -- Sync email and name changes from auth to public.User
  update public."User"
  set
    email = new.email,
    name = coalesce(new.raw_user_meta_data->>'name', name),
    "updatedAt" = now()
  where "authId" = new.id::text;
  
  return new;
end;
$$ language plpgsql security definer;

-- ============================================
-- TRIGGER: On Auth User Updated
-- ============================================
drop trigger if exists on_auth_user_updated on auth.users;

create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check if triggers were created successfully
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  pg_get_triggerdef(oid) as definition
FROM pg_trigger 
WHERE tgname IN ('on_auth_user_created', 'on_auth_user_updated');

-- View recent users (should show authId for new signups)
SELECT 
  id,
  "authId",
  email,
  name,
  role,
  "createdAt"
FROM public."User"
ORDER BY "createdAt" DESC
LIMIT 10;

-- ============================================
-- OPTIONAL: Backfill authId for Existing Users
-- ============================================
-- Uncomment and run if you have existing auth.users that need linking

/*
UPDATE public."User" u
SET "authId" = au.id::text
FROM auth.users au
WHERE u.email = au.email
  AND u."authId" IS NULL;
*/

-- ============================================
-- SUCCESS!
-- ============================================
-- Your Supabase Auth is now integrated.
-- Test by creating a new user in:
-- Supabase Dashboard → Authentication → Users → Add user
