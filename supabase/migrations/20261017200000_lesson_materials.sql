-- Post-lesson material written by the worker job lesson.finalize (issue #13): a summary per
-- language and the lesson vocabulary with meanings in the class languages (SPEC D2).
-- The worker writes with the service role; the teacher edits before publishing (SPEC D3).
-- Students read it only once the lesson is published, through can_read_lesson().

-- Why the last finalize attempt failed, shown on the processing screen; null when it worked.
alter table public.lessons add column processing_error text;

-- ---------------------------------------------------------------------------
-- lesson_summaries: one row per language ('ko' plus each target language).
-- ---------------------------------------------------------------------------
create table public.lesson_summaries (
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2}$'),
  text text not null,
  edited boolean not null default false,
  primary key (lesson_id, lang)
);

-- ---------------------------------------------------------------------------
-- vocab_items / vocab_translations
-- ---------------------------------------------------------------------------
create type public.part_of_speech as enum
  ('noun', 'verb', 'adjective', 'adverb', 'expression', 'grammar', 'other');

create table public.vocab_items (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons (id) on delete cascade,
  -- Display order chosen by the AI (most useful first); the teacher may reorder.
  position integer not null check (position >= 0),
  ko text not null check (length(trim(ko)) > 0),
  pos public.part_of_speech not null default 'other',
  topik_level smallint check (topik_level between 1 and 6),
  -- Example sentence taken from the lesson itself, and the segment it came from.
  example_ko text,
  segment_id uuid references public.segments (id) on delete set null,
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  unique (lesson_id, ko)
);

create index vocab_items_lesson_idx on public.vocab_items (lesson_id, position);

create table public.vocab_translations (
  vocab_id uuid not null references public.vocab_items (id) on delete cascade,
  lang text not null check (lang ~ '^[a-z]{2}$'),
  meaning text not null,
  primary key (vocab_id, lang)
);

-- ---------------------------------------------------------------------------
-- Row Level Security (helpers from 20261017100000_lessons_segments.sql)
-- ---------------------------------------------------------------------------
alter table public.lesson_summaries enable row level security;
alter table public.vocab_items enable row level security;
alter table public.vocab_translations enable row level security;

create policy "lesson_summaries: readers of the lesson" on public.lesson_summaries
  for select to authenticated
  using (public.can_read_lesson(lesson_id));

create policy "lesson_summaries: teacher edits" on public.lesson_summaries
  for all to authenticated
  using (public.is_lesson_teacher(lesson_id))
  with check (public.is_lesson_teacher(lesson_id));

create policy "vocab_items: readers of the lesson" on public.vocab_items
  for select to authenticated
  using (public.can_read_lesson(lesson_id));

create policy "vocab_items: teacher edits" on public.vocab_items
  for all to authenticated
  using (public.is_lesson_teacher(lesson_id))
  with check (public.is_lesson_teacher(lesson_id));

create policy "vocab_translations: readers of the lesson" on public.vocab_translations
  for select to authenticated
  using (exists (
    select 1 from public.vocab_items v
    where v.id = vocab_id and public.can_read_lesson(v.lesson_id)
  ));

create policy "vocab_translations: teacher edits" on public.vocab_translations
  for all to authenticated
  using (exists (
    select 1 from public.vocab_items v
    where v.id = vocab_id and public.is_lesson_teacher(v.lesson_id)
  ))
  with check (exists (
    select 1 from public.vocab_items v
    where v.id = vocab_id and public.is_lesson_teacher(v.lesson_id)
  ));
