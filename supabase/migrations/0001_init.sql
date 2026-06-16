-- RoastMode initial schema (AGENTS.md §8.2, §15.2; PLAN.md data layer).
-- Every user-owned table is keyed to auth.uid() and locked down with RLS.
-- roast_lines is a SHARED pool (§8.4): clients read, only the service-role
-- batch job writes.

-- ---------------------------------------------------------------------------
-- profiles : per-user global defaults + tier (§7.2, §12)
-- ---------------------------------------------------------------------------
create table public.profiles (
  id                uuid primary key references auth.users (id) on delete cascade,
  rudeness_level    smallint not null default 3 check (rudeness_level between 1 and 4),
  escalation_speed  text not null default 'normal' check (escalation_speed in ('slow', 'normal', 'unhinged')),
  quiet_hours_start text,
  quiet_hours_end   text,
  sound             text not null default 'standard' check (sound in ('standard', 'whistle', 'foghorn', 'silent')),
  always_watermark  boolean not null default true,
  tier              text not null default 'free' check (tier in ('free', 'paid')),
  created_at        timestamptz not null default now()
);

-- Auto-create a profile row whenever an auth user (incl. anonymous) is created.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- buddies : accountability buddy links (§4.6)
-- ---------------------------------------------------------------------------
create table public.buddies (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  contact       text not null,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'accepted', 'declined')),
  created_at    timestamptz not null default now()
);
create index buddies_user_id_idx on public.buddies (user_id);

-- ---------------------------------------------------------------------------
-- goals (§4.1)
-- ---------------------------------------------------------------------------
create table public.goals (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references auth.users (id) on delete cascade,
  name             text not null,
  category         text not null check (category in ('gym', 'study', 'chores', 'diet', 'sleep', 'custom')),
  cue              text,
  schedule         jsonb not null,
  rudeness_level   smallint not null check (rudeness_level between 1 and 4),
  escalation_speed text not null check (escalation_speed in ('slow', 'normal', 'unhinged')),
  buddy_id         uuid references public.buddies (id) on delete set null,
  paused           boolean not null default false,
  created_at       timestamptz not null default now()
);
create index goals_user_id_idx on public.goals (user_id);

-- ---------------------------------------------------------------------------
-- completions (§4.3)
-- ---------------------------------------------------------------------------
create table public.completions (
  id        uuid primary key default gen_random_uuid(),
  goal_id   uuid not null references public.goals (id) on delete cascade,
  user_id   uuid not null references auth.users (id) on delete cascade,
  ts        timestamptz not null default now(),
  source    text not null check (source in ('tap', 'notification')),
  witnessed boolean not null default false
);
create index completions_goal_id_idx on public.completions (goal_id);
create index completions_user_ts_idx on public.completions (user_id, ts desc);

-- ---------------------------------------------------------------------------
-- skips (§4.5)
-- ---------------------------------------------------------------------------
create table public.skips (
  id      uuid primary key default gen_random_uuid(),
  goal_id uuid not null references public.goals (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  ts      timestamptz not null default now(),
  reason  text not null
);
create index skips_goal_id_idx on public.skips (goal_id);

-- ---------------------------------------------------------------------------
-- roast_lines : shared pre-generated pool (§8.4) — NOT user-scoped
-- ---------------------------------------------------------------------------
create table public.roast_lines (
  id         uuid primary key default gen_random_uuid(),
  category   text not null check (category in ('gym', 'study', 'chores', 'diet', 'sleep', 'custom')),
  level      smallint not null check (level between 1 and 4),
  wave       smallint not null,
  tactic     text not null check (tactic in ('snark', 'shrink', 'stakes', 'roast')),
  text       text not null,
  created_at timestamptz not null default now()
);
create index roast_lines_lookup_idx on public.roast_lines (category, level, wave);

-- ===========================================================================
-- Row Level Security
-- ===========================================================================
alter table public.profiles    enable row level security;
alter table public.buddies     enable row level security;
alter table public.goals       enable row level security;
alter table public.completions enable row level security;
alter table public.skips       enable row level security;
alter table public.roast_lines enable row level security;

-- profiles: a user sees and edits only their own row.
create policy "profiles_select_own" on public.profiles for select using (auth.uid() = id);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- Owner-only CRUD for the user-scoped tables.
create policy "buddies_crud_own" on public.buddies for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "goals_crud_own" on public.goals for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "completions_crud_own" on public.completions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "skips_crud_own" on public.skips for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- roast_lines: any authenticated user may read the shared pool; no client writes.
create policy "roast_lines_read" on public.roast_lines for select
  using (auth.role() = 'authenticated');
