-- Family invites: an owner generates a single-use code that a new user can
-- redeem to join the family as a `member`. No email sending in v1 — the URL
-- is the invite and gets shared out-of-band (iMessage, printout, verbal).
--
-- Design choices:
--   * code is a UUID stringified -- unguessable and URL-safe, and doubles as
--     the primary key so the /join/:code route can do a direct lookup.
--   * single-use: `consumed_by` and `consumed_at` flip from NULL to a user
--     ref when redeemed. The consume path is an RPC (see below) to keep it
--     atomic with the family_members insert.
--   * 7-day expiry default; the owner can regenerate if it lapses.
--   * RLS: only owners of the family can create/see invites for that family,
--     only the person holding the code can consume it.

create table family_invites (
  code text primary key,
  family_id uuid not null references families(id) on delete cascade,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '7 days'),
  consumed_by uuid references auth.users(id),
  consumed_at timestamptz
);

-- Partial index for the common "open invites for this family" lookup.
-- Can't include `expires_at > now()` here because now() isn't IMMUTABLE and
-- Postgres rejects non-immutable functions in index predicates; the query
-- filters expiry at runtime instead.
create index on family_invites (family_id)
  where consumed_at is null;

alter table family_invites enable row level security;

-- Owners of the family can read + create invites for their family.
create policy family_invites_owner_read on family_invites for select
  using (
    exists (
      select 1 from families f
      where f.id = family_id and f.created_by = auth.uid()
    )
  );

create policy family_invites_owner_insert on family_invites for insert
  with check (
    created_by = auth.uid()
    and exists (
      select 1 from families f
      where f.id = family_id and f.created_by = auth.uid()
    )
  );

-- Redemption happens via the RPC below. No direct UPDATE policy, so the
-- client cannot mark an invite consumed without going through the
-- atomic flow.

-- Atomic consume: verify the invite is still open, add the user to
-- family_members as `member`, mark the invite consumed. SECURITY DEFINER
-- so it bypasses the family_members insert policy — we replicate the
-- business rule (only the invite holder can consume) inside the function.
create or replace function public.consume_family_invite(invite_code text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invite family_invites%rowtype;
  v_user uuid := auth.uid();
begin
  if v_user is null then
    raise exception 'not_authenticated' using errcode = '28000';
  end if;

  select * into v_invite from family_invites where code = invite_code for update;
  if not found then
    raise exception 'invite_not_found' using errcode = 'P0001';
  end if;
  if v_invite.consumed_at is not null then
    raise exception 'invite_already_consumed' using errcode = 'P0001';
  end if;
  if v_invite.expires_at < now() then
    raise exception 'invite_expired' using errcode = 'P0001';
  end if;

  -- Idempotent on re-join: if the user is already a member, just mark
  -- the invite consumed and return the family id.
  insert into family_members (family_id, user_id, role)
  values (v_invite.family_id, v_user, 'member')
  on conflict (family_id, user_id) do nothing;

  update family_invites
     set consumed_by = v_user, consumed_at = now()
   where code = invite_code;

  return v_invite.family_id;
end;
$$;

revoke all on function public.consume_family_invite(text) from public;
grant execute on function public.consume_family_invite(text) to authenticated;
