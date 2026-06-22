-- Phase 6 — extend roast_lines to hold every cached-pool variant (§8.4, §4.3, §4.5):
--   • wave    — escalation Wave 1–4 lines, keyed by (category, level, wave, tactic) [existing shape]
--   • skip    — skip-confirmation roasts, keyed by level (category optional)
--   • digest  — daily multi-goal summary, keyed by level (cross-category → category null)
--   • partial — quantified partial-completion roasts, keyed by (category, level, bucket)
--
-- wave/tactic/category become nullable so the non-wave kinds don't carry dead
-- columns. `bucket` keys partial lines by completion-ratio band. Idempotent.

-- 1. New columns -----------------------------------------------------------
alter table public.roast_lines
  add column if not exists kind   text not null default 'wave',
  add column if not exists bucket text;

-- 2. Relax the wave-only columns so skip/digest/partial can leave them null --
alter table public.roast_lines alter column wave   drop not null;
alter table public.roast_lines alter column tactic drop not null;
alter table public.roast_lines alter column category drop not null;

-- 3. Constraints (drop-then-add so re-runs and the new null cases pass) -----
alter table public.roast_lines drop constraint if exists roast_lines_kind_check;
alter table public.roast_lines
  add constraint roast_lines_kind_check
  check (kind in ('wave', 'skip', 'digest', 'partial'));

alter table public.roast_lines drop constraint if exists roast_lines_category_check;
alter table public.roast_lines
  add constraint roast_lines_category_check
  check (category is null or category in
    ('gym', 'study', 'chores', 'diet', 'water', 'sleep', 'custom'));

alter table public.roast_lines drop constraint if exists roast_lines_tactic_check;
alter table public.roast_lines
  add constraint roast_lines_tactic_check
  check (tactic is null or tactic in ('snark', 'shrink', 'stakes', 'roast'));

alter table public.roast_lines drop constraint if exists roast_lines_bucket_check;
alter table public.roast_lines
  add constraint roast_lines_bucket_check
  check (bucket is null or bucket in ('low', 'half', 'almost'));

-- 4. Lookup indexes for the non-wave kinds (wave index already exists) ------
create index if not exists roast_lines_kind_idx on public.roast_lines (kind, level);
create index if not exists roast_lines_partial_idx
  on public.roast_lines (kind, category, level, bucket);
