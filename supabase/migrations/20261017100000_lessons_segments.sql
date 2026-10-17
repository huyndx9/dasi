-- Lessons, recognised segments and their translations (issue #5).
-- Feeds the new-lesson wizard (SPEC §3), live class (§4) and lesson detail (§5).
-- RLS rules: docs/ARCHITECTURE.md → "RLS (nguyên tắc)". The realtime gateway and
-- worker write segments and translations with the service role, which bypasses RLS.

create type public.lesson_format as enum ('room', 'online', 'hybrid');
create type public.audio_source as enum ('mic', 'tab');
create type public.lesson_status as enum ('live', 'processing', 'review', 'published');
create type public.subtitle_display as enum ('bilingual', 'korean_only', 'hidden');

-- ---------------------------------------------------------------------------
-- lessons
-- ---------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references public.classes (id) on delete cascade,
  title text not null check (length(trim(title)) > 0),
  topic text,
  textbook text,
  format public.lesson_format not null,
  sources public.audio_source[] not null check (cardinality(sources) between 1 and 2),
  -- Subtitle languages (ISO 639-1); at most MAX_TARGET_LANGS_PER_LESSON (SPEC §8).
  target_langs text[] not null default '{}'
    check (cardinality(target_langs) <= 5 and array_to_string(target_langs, ',') ~ '^([a-z]{2}(,[a-z]{2})*)?$'),
  display public.subtitle_display not null default 'bilingual',
  status public.lesson_status not null default 'live',
  started_at timestamptz not null default now(),
  ended_at timestamptz check (ended_at is null or ended_at >= started_at),
  audio_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lessons_class_id_idx on public.lessons (class_id, started_at desc);
-- A class teaches one lesson at a time.
create unique index lessons_one_live_per_class on public.lessons (class_id) where status = 'live';

create trigger lessons_touch before update on public.lessons
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- segments: final recognised utterances only (partials are never stored).
-- ---------------------------------------------------------------------------
create table public.segments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  seq integer not null check (seq >= 0),
  source public.audio_source not null,
  speaker_label text,
  speaker_profile_id uuid references public.profiles (id) on delete set null,
  lang text not null default 'ko' check (lang ~ '^[a-z]{2}$'),
  text text not null,
  start_ms integer not null check (start_ms >= 0),
  end_ms integer not null check (end_ms >= start_ms),
  -- Set when the teacher corrects the recognised text (SPEC D4).
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lesson_id, seq)
);

create table public.segment_translations (
  segment_id uuid not null references public.segments (id) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2}$'),
  text text not null,
  primary key (segment_id, lang)
);

-- ---------------------------------------------------------------------------
-- RLS helpers (SECURITY DEFINER, see the first migration for why).
-- ---------------------------------------------------------------------------
create function public.is_lesson_teacher(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = p_lesson_id and c.teacher_id = (select auth.uid())
  );
$$;

-- Teachers read every lesson of their classes; students read live and published
-- lessons of classes they belong to (not lessons still being processed or reviewed).
create function public.can_read_lesson(p_lesson_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.lessons l
    join public.classes c on c.id = l.class_id
    where l.id = p_lesson_id
      and (
        c.teacher_id = (select auth.uid())
        or (
          l.status in ('live', 'published')
          and exists (
            select 1 from public.class_members m
            where m.class_id = l.class_id and m.student_id = (select auth.uid())
          )
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.lessons enable row level security;
alter table public.segments enable row level security;
alter table public.segment_translations enable row level security;

create policy "lessons: teacher manages own classes" on public.lessons
  for all to authenticated
  using (public.is_class_teacher(class_id))
  with check (public.is_class_teacher(class_id));

create policy "lessons: member reads live and published" on public.lessons
  for select to authenticated
  using (status in ('live', 'published') and public.is_class_member(class_id));

create policy "segments: readers of the lesson" on public.segments
  for select to authenticated
  using (public.can_read_lesson(lesson_id));

create policy "segments: teacher edits" on public.segments
  for all to authenticated
  using (public.is_lesson_teacher(lesson_id))
  with check (public.is_lesson_teacher(lesson_id));

create policy "segment_translations: readers of the lesson" on public.segment_translations
  for select to authenticated
  using (exists (
    select 1 from public.segments s
    where s.id = segment_id and public.can_read_lesson(s.lesson_id)
  ));

create policy "segment_translations: teacher edits" on public.segment_translations
  for all to authenticated
  using (exists (
    select 1 from public.segments s
    where s.id = segment_id and public.is_lesson_teacher(s.lesson_id)
  ))
  with check (exists (
    select 1 from public.segments s
    where s.id = segment_id and public.is_lesson_teacher(s.lesson_id)
  ));
