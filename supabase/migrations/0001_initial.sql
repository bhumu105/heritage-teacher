-- Heritage Teacher — initial schema + Row Level Security.
-- Every family is a tenant; members only ever see their own family's data.

-- --------------------------------------------------------------------------
-- Tables
-- --------------------------------------------------------------------------

create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now()
);

create table family_members (
  family_id uuid not null references families(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner','member')),
  added_at timestamptz not null default now(),
  primary key (family_id, user_id)
);

create index on family_members (user_id);

create table teachers (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  display_name text not null,
  native_language text not null,
  created_at timestamptz not null default now()
);

create table consent_records (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null references teachers(id) on delete cascade,
  scope text not null check (scope in ('record','archive','train','voice')),
  granted_at timestamptz not null default now(),
  granted_via text not null check (granted_via in ('paper-signed','verbal-clip','app-checkbox')),
  evidence_uri text,
  revoked_at timestamptz
);

create index on consent_records (teacher_id, scope) where revoked_at is null;

create table recording_sessions (
  id uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  teacher_id uuid not null references teachers(id) on delete cascade,
  recorded_by uuid not null references auth.users(id),
  started_at timestamptz not null default now(),
  duration_seconds integer,
  consent_clip_uri text,
  status text not null default 'pending'
    check (status in ('pending','transcribing','ready','failed','deleted')),
  raw_audio_uri text
);

create index on recording_sessions (family_id, started_at desc);

create table lessons (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references recording_sessions(id) on delete cascade,
  family_id uuid not null references families(id) on delete cascade,
  title text,
  transcript text not null,
  translation text,
  cultural_note text,
  language_code text not null,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index on lessons (family_id, created_at desc) where deleted_at is null;

-- --------------------------------------------------------------------------
-- Row Level Security
-- --------------------------------------------------------------------------

alter table families enable row level security;
alter table family_members enable row level security;
alter table teachers enable row level security;
alter table consent_records enable row level security;
alter table recording_sessions enable row level security;
alter table lessons enable row level security;

-- Helper: is this user a member of this family?
create or replace function public.is_family_member(fid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

-- families: members can read; anyone authenticated can insert (becomes the owner).
create policy families_read on families for select
  using (public.is_family_member(id));
create policy families_insert on families for insert
  with check (created_by = auth.uid());
create policy families_owner_update on families for update
  using (created_by = auth.uid())
  with check (created_by = auth.uid());

-- family_members: members can read their family's rows; owners can manage.
create policy fm_read on family_members for select
  using (public.is_family_member(family_id));
create policy fm_insert_self on family_members for insert
  with check (user_id = auth.uid() or exists (
    select 1 from families f where f.id = family_id and f.created_by = auth.uid()
  ));
create policy fm_delete_owner on family_members for delete
  using (exists (
    select 1 from families f where f.id = family_id and f.created_by = auth.uid()
  ));

-- teachers: members read / write their family's teachers.
create policy teachers_read on teachers for select
  using (public.is_family_member(family_id));
create policy teachers_write on teachers for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- consent_records: members can read / write consents for their family's teachers.
create policy consent_read on consent_records for select
  using (exists (
    select 1 from teachers t
    where t.id = teacher_id and public.is_family_member(t.family_id)
  ));
create policy consent_write on consent_records for all
  using (exists (
    select 1 from teachers t
    where t.id = teacher_id and public.is_family_member(t.family_id)
  ))
  with check (exists (
    select 1 from teachers t
    where t.id = teacher_id and public.is_family_member(t.family_id)
  ));

-- recording_sessions: members read / write their family's sessions.
create policy sessions_read on recording_sessions for select
  using (public.is_family_member(family_id));
create policy sessions_write on recording_sessions for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- lessons: members read their family's non-deleted lessons; soft-delete via update.
create policy lessons_read on lessons for select
  using (public.is_family_member(family_id) and deleted_at is null);
create policy lessons_write on lessons for all
  using (public.is_family_member(family_id))
  with check (public.is_family_member(family_id));

-- --------------------------------------------------------------------------
-- Storage bucket + policies
-- --------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('recordings', 'recordings', false)
on conflict (id) do nothing;

-- Path convention: recordings/{family_id}/{session_id}/{filename}
-- RLS on storage.objects: members can read/write files under their family's prefix.
create policy "recordings: read own family"
  on storage.objects for select
  using (
    bucket_id = 'recordings'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );
create policy "recordings: write own family"
  on storage.objects for insert
  with check (
    bucket_id = 'recordings'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );
create policy "recordings: delete own family"
  on storage.objects for delete
  using (
    bucket_id = 'recordings'
    and public.is_family_member(((storage.foldername(name))[1])::uuid)
  );
