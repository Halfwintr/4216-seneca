-- ─────────────────────────────────────────────────────────────────────────────
-- Storage: public bucket for listing image/branding/frame-sequence assets.
-- Reads are public (published microsites serve these directly); writes require
-- an authenticated user. Per-listing path scoping is refined in a later phase.
-- ─────────────────────────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public)
values ('listing-assets', 'listing-assets', true)
on conflict (id) do nothing;

drop policy if exists listing_assets_public_read on storage.objects;
create policy listing_assets_public_read on storage.objects
  for select using (bucket_id = 'listing-assets');

drop policy if exists listing_assets_auth_insert on storage.objects;
create policy listing_assets_auth_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'listing-assets');

drop policy if exists listing_assets_auth_update on storage.objects;
create policy listing_assets_auth_update on storage.objects
  for update to authenticated
  using (bucket_id = 'listing-assets')
  with check (bucket_id = 'listing-assets');

drop policy if exists listing_assets_auth_delete on storage.objects;
create policy listing_assets_auth_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'listing-assets');
