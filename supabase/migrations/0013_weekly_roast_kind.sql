-- Add the 'weekly' roast kind (AGENTS.md §4.7). Weekly-progress roasts mock the
-- days-per-week frequency ratio (e.g. "gym 2 of 5 days this week"), distinct
-- from 'partial' (per-session amount). Keyed like partial: (category, level,
-- bucket). Idempotent.

alter table public.roast_lines drop constraint if exists roast_lines_kind_check;
alter table public.roast_lines
  add constraint roast_lines_kind_check
  check (kind in ('wave', 'skip', 'digest', 'partial', 'weekly'));

-- The (kind, category, level, bucket) lookup index from 0008 already covers
-- weekly reads, so no new index is needed.
