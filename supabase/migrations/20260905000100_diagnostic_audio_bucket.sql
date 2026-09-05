-- =============================================================================
-- Public bucket for the diagnostic funnel's pre-generated audio.
--
-- The diagnostic snapshot (diagnostic_questions) only ever contains phrases
-- already cleared for anonymous, public exposure — approved, non-safety,
-- non-trade-specific, enforced in scripts/seed-diagnostic.mjs. The private
-- `audio` bucket used by the paid course requires a signed URL gated on
-- entitlement (see 20260823000300_rls.sql), which an anonymous visitor by
-- definition does not have. Rather than bend that entitlement check for
-- seven marketing clips, the diagnostic funnel gets its own small, public,
-- read-only bucket instead.
-- =============================================================================

insert into storage.buckets (id, name, public)
values ('diagnostic-audio', 'diagnostic-audio', true)
on conflict (id) do nothing;

create policy diagnostic_audio_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'diagnostic-audio');

-- Writes go through the service-role client in
-- scripts/generate-diagnostic-audio.mjs, which bypasses RLS entirely. These
-- policies exist for defense in depth if an admin UI ever writes here too.
create policy diagnostic_audio_admin_write on storage.objects
  for insert to authenticated
  with check (bucket_id = 'diagnostic-audio' and public.is_admin());

create policy diagnostic_audio_admin_update on storage.objects
  for update to authenticated
  using (bucket_id = 'diagnostic-audio' and public.is_admin())
  with check (bucket_id = 'diagnostic-audio' and public.is_admin());

create policy diagnostic_audio_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'diagnostic-audio' and public.is_admin());
