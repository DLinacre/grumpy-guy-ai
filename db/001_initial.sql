-- Supabase / PostgreSQL migration. auth.users is managed by Supabase.
create extension if not exists pgcrypto;
create type public.grumble_tone as enum ('dry', 'brutal', 'supportive');
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  tone public.grumble_tone not null default 'dry', autoplay boolean not null default false,
  reduced_motion boolean not null default false, updated_at timestamptz not null default now()
);
create table public.grumbles (
  id uuid primary key default gen_random_uuid(), user_id uuid references auth.users(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 1000), tone public.grumble_tone not null,
  favorite boolean not null default false, created_at timestamptz not null default now()
);
create index grumbles_owner_created_idx on public.grumbles (user_id, created_at desc);
alter table public.profiles enable row level security; alter table public.user_preferences enable row level security; alter table public.grumbles enable row level security;
create policy "users manage own profile" on public.profiles for all using (auth.uid()=id) with check (auth.uid()=id);
create policy "users manage own preferences" on public.user_preferences for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users read own grumbles" on public.grumbles for select using (auth.uid()=user_id);
create policy "users update own grumbles" on public.grumbles for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "users delete own grumbles" on public.grumbles for delete using (auth.uid()=user_id);
-- Worker uses service role only for server-side inserts; it is never browser accessible.
create or replace function public.on_auth_user_created() returns trigger language plpgsql security definer set search_path=public as $$ begin insert into public.profiles(id) values(new.id); insert into public.user_preferences(user_id) values(new.id); return new; end; $$;
create trigger auth_user_created after insert on auth.users for each row execute procedure public.on_auth_user_created();
