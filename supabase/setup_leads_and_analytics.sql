-- ════════════════════════════════════════════════════════════════
--  CyberPatriot — leads + website analytics setup
--  Run once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
--  Safe to run again: it only creates or updates what is missing.
-- ════════════════════════════════════════════════════════════════

-- Who may read and manage leads and analytics in the dashboard.
-- These are the owner's sign-in emails. If you sign in to the dashboard
-- with a different email, add it to this list and run the script again.
create or replace function public.cp_is_owner()
returns boolean
language sql stable
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) in (
    'cyber1patriot@gmail.com',
    'fbrehm1990@gmail.com'
  );
$$;

-- ── LEADS ───────────────────────────────────────────────────────
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now()
);

alter table public.leads add column if not exists name          text;
alter table public.leads add column if not exists email         text;
alter table public.leads add column if not exists business      text;
alter table public.leads add column if not exists business_type text;
alter table public.leads add column if not exists timeline      text;
alter table public.leads add column if not exists message       text;
alter table public.leads add column if not exists status        text not null default 'new';
alter table public.leads add column if not exists source        text not null default 'website';

alter table public.leads enable row level security;

drop policy if exists "cp website can submit leads" on public.leads;
create policy "cp website can submit leads" on public.leads
  for insert to anon, authenticated
  with check (
    status = 'new'
    and char_length(coalesce(name, ''))     <= 200
    and char_length(coalesce(email, ''))    <= 200
    and char_length(coalesce(business, '')) <= 200
    and char_length(coalesce(message, ''))  <= 5000
  );

drop policy if exists "cp owner reads leads"   on public.leads;
drop policy if exists "cp owner updates leads" on public.leads;
drop policy if exists "cp owner deletes leads" on public.leads;
create policy "cp owner reads leads"   on public.leads for select to authenticated using (public.cp_is_owner());
create policy "cp owner updates leads" on public.leads for update to authenticated using (public.cp_is_owner()) with check (public.cp_is_owner());
create policy "cp owner deletes leads" on public.leads for delete to authenticated using (public.cp_is_owner());

-- ── WEBSITE ANALYTICS ───────────────────────────────────────────
create table if not exists public.page_events (
  id          bigint generated always as identity primary key,
  created_at  timestamptz not null default now(),
  visitor_id  text,
  session_id  text,
  event       text not null,
  path        text,
  label       text,
  target      text,
  referrer    text,
  utm_source  text,
  utm_medium  text,
  utm_campaign text,
  device      text,
  browser     text,
  os          text,
  screen      text,
  lang        text,
  tz          text,
  duration_ms integer,
  scroll_pct  integer
);

create index if not exists page_events_created_at_idx on public.page_events (created_at desc);

alter table public.page_events enable row level security;

drop policy if exists "cp website logs events" on public.page_events;
create policy "cp website logs events" on public.page_events
  for insert to anon, authenticated
  with check (
    event in ('pageview','click','showcase_view','form_submit','page_exit')
    and char_length(coalesce(path, ''))     <= 300
    and char_length(coalesce(label, ''))    <= 200
    and char_length(coalesce(target, ''))   <= 500
    and char_length(coalesce(referrer, '')) <= 500
  );

drop policy if exists "cp owner reads events"   on public.page_events;
drop policy if exists "cp owner deletes events" on public.page_events;
create policy "cp owner reads events"   on public.page_events for select to authenticated using (public.cp_is_owner());
create policy "cp owner deletes events" on public.page_events for delete to authenticated using (public.cp_is_owner());
