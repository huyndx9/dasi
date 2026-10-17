-- Profiles, classes and class membership (ROADMAP Phase 0, SPEC A1–A3, C1–C3).
-- RLS rules: docs/ARCHITECTURE.md → "RLS (nguyên tắc)".

create type public.user_role as enum ('teacher', 'student', 'admin');

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger on sign-up.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '',
  -- Null until the user picks a role after the first sign-in (A2).
  role public.user_role,
  -- ISO 639-1 codes; the list of valid codes lives in packages/shared/src/languages.ts.
  mother_tongue text check (mother_tongue ~ '^[a-z]{2}$'),
  ui_lang text not null default 'vi' check (ui_lang ~ '^[a-z]{2}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', '')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- classes
-- ---------------------------------------------------------------------------

-- 6 characters without 0/O/1/I; must match INVITE_CODE_ALPHABET in packages/shared.
create function public.generate_invite_code()
returns text
language plpgsql
set search_path = ''
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  code text := '';
begin
  for i in 1..6 loop
    code := code || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
  end loop;
  return code;
end;
$$;

create table public.classes (
  id uuid primary key default gen_random_uuid(),
  teacher_id uuid not null default auth.uid() references public.profiles (id) on delete cascade,
  name text not null check (length(trim(name)) > 0),
  level text,
  schedule text,
  textbook text,
  invite_code text not null unique default public.generate_invite_code()
    check (invite_code ~ '^[A-HJ-NP-Z2-9]{6}$'),
  settings jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index classes_teacher_id_idx on public.classes (teacher_id);

create trigger classes_touch before update on public.classes
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- class_members
-- ---------------------------------------------------------------------------
create table public.class_members (
  class_id uuid not null references public.classes (id) on delete cascade,
  student_id uuid not null references public.profiles (id) on delete cascade,
  mother_tongue text not null check (mother_tongue ~ '^[a-z]{2}$'),
  -- Consent to recording and AI processing, given on the join screen (PRIVACY.md).
  consented_at timestamptz not null,
  joined_at timestamptz not null default now(),
  primary key (class_id, student_id)
);

create index class_members_student_id_idx on public.class_members (student_id);

-- ---------------------------------------------------------------------------
-- Helpers for RLS. SECURITY DEFINER so policies on classes and class_members
-- can refer to each other without recursive policy evaluation.
-- ---------------------------------------------------------------------------
create function public.is_class_teacher(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.classes where id = p_class_id and teacher_id = (select auth.uid())
  );
$$;

create function public.is_class_member(p_class_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.class_members
    where class_id = p_class_id and student_id = (select auth.uid())
  );
$$;

create function public.current_user_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select role from public.profiles where id = (select auth.uid());
$$;

-- True when the caller and p_profile_id are teacher and student of the same class.
create function public.shares_class_with(p_profile_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.classes c
    join public.class_members m on m.class_id = c.id
    where (c.teacher_id = (select auth.uid()) and m.student_id = p_profile_id)
       or (c.teacher_id = p_profile_id and m.student_id = (select auth.uid()))
  );
$$;

-- Students cannot read a class before joining, so joining by invite code goes
-- through this function instead of a direct insert.
create function public.join_class(p_invite_code text, p_mother_tongue text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_class_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;

  if public.current_user_role() is distinct from 'student' then
    raise exception 'only students can join a class' using errcode = '42501';
  end if;

  select id into v_class_id from public.classes where invite_code = upper(trim(p_invite_code));
  if v_class_id is null then
    raise exception 'invite code not found' using errcode = 'P0002';
  end if;

  insert into public.class_members (class_id, student_id, mother_tongue, consented_at)
  values (v_class_id, (select auth.uid()), p_mother_tongue, now())
  on conflict (class_id, student_id) do update
    set mother_tongue = excluded.mother_tongue;

  return v_class_id;
end;
$$;

revoke execute on function public.join_class(text, text) from public, anon;
grant execute on function public.join_class(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.classes enable row level security;
alter table public.class_members enable row level security;

-- profiles
create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: read teacher and students of shared classes" on public.profiles
  for select to authenticated
  using (public.shares_class_with(id));

-- Users cannot make themselves admin; admins are set with the service role.
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()) and role is distinct from 'admin');

-- classes
create policy "classes: teacher manages own" on public.classes
  for all to authenticated
  using (teacher_id = (select auth.uid()))
  with check (
    teacher_id = (select auth.uid()) and public.current_user_role() = 'teacher'
  );

create policy "classes: member reads" on public.classes
  for select to authenticated
  using (public.is_class_member(id));

-- class_members (inserts go through join_class)
create policy "class_members: teacher reads" on public.class_members
  for select to authenticated
  using (public.is_class_teacher(class_id));

create policy "class_members: teacher removes" on public.class_members
  for delete to authenticated
  using (public.is_class_teacher(class_id));

create policy "class_members: student reads own" on public.class_members
  for select to authenticated
  using (student_id = (select auth.uid()));

create policy "class_members: student updates own" on public.class_members
  for update to authenticated
  using (student_id = (select auth.uid()))
  with check (student_id = (select auth.uid()));

create policy "class_members: student leaves" on public.class_members
  for delete to authenticated
  using (student_id = (select auth.uid()));

-- Column-level limits on top of RLS: students may only change their mother tongue.
revoke update on public.class_members from authenticated;
grant update (mother_tongue) on public.class_members to authenticated;
