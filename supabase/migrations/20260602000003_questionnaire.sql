-- ─────────────────────────────────────────────────────────────────────────────
-- Discovery questionnaire + AI-generation flag for the guided walkthrough.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.listings
  add column if not exists questionnaire jsonb not null default '{}'::jsonb;

alter table public.listings
  add column if not exists ai_generated boolean not null default false;
