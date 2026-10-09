-- Flatmate Ledger shared-household starter schema for Supabase/Postgres.
-- Read README.md before running. This schema is NOT a substitute for reviewing access policies.
create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Flatmate Ledger',
  invite_code text unique default encode(gen_random_bytes(12),'hex'),
  created_at timestamptz not null default now()
);
create table if not exists public.household_members (
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role text not null default 'member' check (role in ('owner','member')),
  joined_at timestamptz not null default now(),
  primary key (household_id,user_id)
);
create table if not exists public.shared_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  description text not null check (length(trim(description)) between 1 and 120),
  amount numeric(12,2) not null check (amount > 0),
  payer_name text not null,
  expense_date date not null,
  pool text not null default 'shared' check (pool in ('shared','market')),
  category text not null default 'Other',
  notes text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.personal_expenses (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  description text not null,
  amount numeric(12,2) not null check (amount > 0),
  expense_date date not null,
  category text not null default 'Other',
  created_at timestamptz not null default now()
);
create table if not exists public.nutrition_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  entry_type text not null check (entry_type in ('Food','Supplement')),
  item_name text not null,
  serving text not null default '',
  nutrients jsonb not null default '{}'::jsonb,
  notes text not null default '',
  created_at timestamptz not null default now()
);
create table if not exists public.learning_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  entry_date date not null,
  project text not null default '',
  hours numeric(5,2) not null default 0 check (hours >= 0 and hours <= 24),
  learned text not null,
  tasks_done text not null default '',
  blockers text not null default '',
  next_action text not null default '',
  status text not null default 'In progress',
  created_at timestamptz not null default now()
);
create table if not exists public.work_tasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  task text not null,
  assigned_name text not null,
  task_date date not null,
  status text not null default 'Pending' check (status in ('Pending','Completed','Skipped')),
  notes text not null default '',
  created_by uuid not null default auth.uid() references auth.users(id),
  created_at timestamptz not null default now()
);

create index if not exists shared_expenses_household_date_idx on public.shared_expenses(household_id,expense_date desc);
create index if not exists personal_expenses_owner_date_idx on public.personal_expenses(owner_id,expense_date desc);
create index if not exists nutrition_owner_date_idx on public.nutrition_entries(owner_id,entry_date desc);
create index if not exists learning_owner_date_idx on public.learning_entries(owner_id,entry_date desc);
create index if not exists work_tasks_household_date_idx on public.work_tasks(household_id,task_date desc);

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.shared_expenses enable row level security;
alter table public.personal_expenses enable row level security;
alter table public.nutrition_entries enable row level security;
alter table public.learning_entries enable row level security;
alter table public.work_tasks enable row level security;

-- Membership helper. Security definer avoids recursive RLS evaluation on household_members.
create or replace function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path=public
as $$ select exists(select 1 from public.household_members m where m.household_id=hid and m.user_id=auth.uid()) $$;

create policy "members can view own memberships" on public.household_members for select
using (user_id=auth.uid() or public.is_household_member(household_id));
create policy "members can view household" on public.households for select
using (public.is_household_member(id));
create policy "members can insert shared expenses" on public.shared_expenses for insert
with check (public.is_household_member(household_id) and created_by=auth.uid());
create policy "members can view shared expenses" on public.shared_expenses for select
using (public.is_household_member(household_id));
create policy "members can update shared expenses" on public.shared_expenses for update
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members can delete shared expenses" on public.shared_expenses for delete
using (public.is_household_member(household_id));

create policy "owner can view personal expenses" on public.personal_expenses for select
using (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can insert personal expenses" on public.personal_expenses for insert
with check (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can update personal expenses" on public.personal_expenses for update
using (owner_id=auth.uid() and public.is_household_member(household_id))
with check (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can delete personal expenses" on public.personal_expenses for delete
using (owner_id=auth.uid() and public.is_household_member(household_id));

create policy "owner can view nutrition" on public.nutrition_entries for select
using (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can insert nutrition" on public.nutrition_entries for insert
with check (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can update nutrition" on public.nutrition_entries for update
using (owner_id=auth.uid() and public.is_household_member(household_id))
with check (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can delete nutrition" on public.nutrition_entries for delete
using (owner_id=auth.uid() and public.is_household_member(household_id));

create policy "owner can view learning" on public.learning_entries for select
using (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can insert learning" on public.learning_entries for insert
with check (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can update learning" on public.learning_entries for update
using (owner_id=auth.uid() and public.is_household_member(household_id))
with check (owner_id=auth.uid() and public.is_household_member(household_id));
create policy "owner can delete learning" on public.learning_entries for delete
using (owner_id=auth.uid() and public.is_household_member(household_id));

create policy "members can view tasks" on public.work_tasks for select
using (public.is_household_member(household_id));
create policy "members can add tasks" on public.work_tasks for insert
with check (public.is_household_member(household_id) and created_by=auth.uid());
create policy "members can update tasks" on public.work_tasks for update
using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members can delete tasks" on public.work_tasks for delete
using (public.is_household_member(household_id));

-- Enable realtime for shared expense changes. If already added, ignore duplicate publication errors.
do $$ begin
  alter publication supabase_realtime add table public.shared_expenses;
exception when duplicate_object then null;
when undefined_object then raise notice 'Create supabase_realtime publication if required by your project'; end $$;

-- IMPORTANT: Create the first household and its six membership rows through a trusted setup/admin flow.
-- Do not expose invite_code or service-role credentials publicly.
