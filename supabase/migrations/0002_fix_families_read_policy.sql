-- Fix for onboarding bootstrap.
--
-- The original `families_read` SELECT policy only allowed reads when the
-- caller was already listed in family_members. That breaks `INSERT ...
-- RETURNING id`, because the RETURNING clause re-evaluates the SELECT policy
-- on the freshly inserted row — and at that moment the creator isn't a
-- family_members row yet (we insert that immediately after). Postgres then
-- rejects with SQLSTATE 42501, which surfaces as the misleading
-- "new row violates row-level security policy" error.
--
-- Allow the creator to always read their own families. This is narrow (they
-- can only ever see rows where they are the creator OR an explicit member),
-- and makes the bootstrap flow atomic instead of requiring a separate
-- server-side function to set up a family.

drop policy if exists families_read on families;

create policy families_read on families for select
  using (
    public.is_family_member(id)
    or created_by = auth.uid()
  );
