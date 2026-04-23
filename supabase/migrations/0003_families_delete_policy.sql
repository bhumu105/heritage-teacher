-- Allow the family creator to delete their family. Cascades through
-- family_members, teachers, consent_records, recording_sessions, and
-- lessons via the existing ON DELETE CASCADE foreign keys, so a single
-- DELETE on families.id removes the whole tenant.
--
-- Intentionally restricted to `created_by`, not any owner, so a second
-- owner can't nuke the archive without the original creator's involvement.

create policy families_delete on families for delete
  using (created_by = auth.uid());
