-- ─────────────────────────────────────────────────────────────────────────────
-- Carry the photo's shot classification onto moments.
--
-- `shot_type` ('wide' | 'detail') and `render_candidate` originate on assets
-- (see 20260602000004). They are copied onto each moment when a listing is
-- generated so the published renderer can decide which images belong in the
-- photo carousel (detail / non-3D shots) vs. the cinematic scene backgrounds
-- (wide establishing / 3D-render shots).
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.moments
  add column if not exists shot_type        text,            -- 'wide' | 'detail'
  add column if not exists render_candidate boolean not null default false;
