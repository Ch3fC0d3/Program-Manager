-- Enable UUID extension if not already enabled
create extension if not exists "uuid-ossp";

-- Function to handle new user creation from Supabase Auth
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public."User"(id, "authId", email, name, password, role, "createdAt", "updatedAt")
  values (
    gen_random_uuid()::text,
    new.id::text,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    null,  -- password is null for OAuth users
    'MEMBER',
    now(),
    now()
  );
  return new;
end;
$$ language plpgsql security definer;

-- Drop existing trigger if it exists
drop trigger if exists on_auth_user_created on auth.users;

-- Create trigger for new auth users
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Optional: Function to sync user updates from auth to public.User
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

-- Drop existing update trigger if it exists
drop trigger if exists on_auth_user_updated on auth.users;

-- Create trigger for auth user updates
create trigger on_auth_user_updated
  after update on auth.users
  for each row execute procedure public.handle_user_update();
