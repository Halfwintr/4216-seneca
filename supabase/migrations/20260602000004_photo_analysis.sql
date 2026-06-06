-- ─────────────────────────────────────────────────────────────────────────────
-- AI photo analysis + pre-answered guided questionnaire.
--
-- Each uploaded asset is analyzed by Gemini vision: a description, detected room
-- type, shot classification (wide establishing vs. detail), 3D-render candidacy,
-- and a grouping key so photos of the same space stay together and in order.
--
-- The listing gains a `guided_answers` array — a step-by-step questionnaire that
-- Gemini pre-answers from the photos; the owner agrees with or edits each answer.
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.assets
  add column if not exists ai_description   text,
  add column if not exists room_type        text,
  add column if not exists shot_type        text,            -- 'wide' | 'detail'
  add column if not exists render_candidate boolean not null default false,
  add column if not exists group_key        text,
  add column if not exists group_label      text,
  add column if not exists group_order      int  not null default 0,
  add column if not exists sort_order       int  not null default 0,
  add column if not exists analyzed         boolean not null default false;

-- Pre-answered questionnaire: [{ id, question, answer, approved }]
alter table public.listings
  add column if not exists guided_answers jsonb not null default '[]'::jsonb;
