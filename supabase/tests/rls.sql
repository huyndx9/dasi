-- RLS checks for profiles, classes, class_members, lessons and lesson materials.
-- Runs after auth-stub.sql and all migrations; any failed check raises and stops psql
-- (ON_ERROR_STOP).

create function pg_temp.act_as(p_user uuid) returns void language plpgsql as $$
begin
  perform set_config('request.jwt.claim.sub', coalesce(p_user::text, ''), false);
  if p_user is null then
    execute 'set role anon';
  else
    execute 'set role authenticated';
  end if;
end $$;

create function pg_temp.check(p_ok boolean, p_what text) returns void language plpgsql as $$
begin
  if not coalesce(p_ok, false) then
    raise exception 'RLS check failed: %', p_what;
  end if;
  raise notice 'ok - %', p_what;
end $$;

-- Fixture users (fictional). Profiles are created by the sign-up trigger.
insert into auth.users (id, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', '{"full_name": "Teacher A"}'),
  ('00000000-0000-0000-0000-00000000000b', '{"full_name": "Teacher B"}'),
  ('00000000-0000-0000-0000-000000000001', '{"name": "Student 1"}'),
  ('00000000-0000-0000-0000-000000000002', '{}');

select pg_temp.check(
  (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000a') = 'Teacher A',
  'sign-up trigger creates a profile with the Google name');

update public.profiles set role = 'teacher'
  where id in ('00000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000b');
update public.profiles set role = 'student'
  where id in ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002');

-- Teacher A creates a class.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.classes (id, name) values ('10000000-0000-0000-0000-000000000001', 'Sơ cấp 1');
select pg_temp.check(
  (select teacher_id from public.classes where id = '10000000-0000-0000-0000-000000000001')
    = '00000000-0000-0000-0000-00000000000a',
  'teacher_id defaults to the caller');
select pg_temp.check(
  (select invite_code ~ '^[A-HJ-NP-Z2-9]{6}$' from public.classes where id = '10000000-0000-0000-0000-000000000001'),
  'invite code is generated');
reset role;

-- A student cannot create a class.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
do $$ begin
  insert into public.classes (name) values ('Lớp giả');
  raise exception 'RLS check failed: student created a class';
exception when insufficient_privilege then raise notice 'ok - student cannot create a class';
end $$;

-- Before joining, the student cannot see the class.
select pg_temp.check((select count(*) from public.classes) = 0, 'non-member sees no classes');

-- Student 1 joins with a lowercase, padded code.
reset role;
select set_config('test.code', (select invite_code from public.classes limit 1), false);
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check(
  public.join_class(' ' || lower(current_setting('test.code')) || ' ', 'vi')
    = '10000000-0000-0000-0000-000000000001',
  'join_class accepts a lowercase code');
select pg_temp.check((select count(*) from public.classes) = 1, 'member sees the class');
select pg_temp.check(
  (select count(*) from public.profiles) = 2,
  'student sees own profile and the class teacher only');
select pg_temp.check(
  (select consented_at is not null from public.class_members), 'join records consent time');

-- Student can change mother tongue but not other columns.
update public.class_members set mother_tongue = 'zh';
select pg_temp.check((select mother_tongue from public.class_members) = 'zh', 'student updates mother tongue');
do $$ begin
  update public.class_members set consented_at = now() - interval '1 year';
  raise exception 'RLS check failed: student changed consented_at';
exception when insufficient_privilege then raise notice 'ok - student cannot rewrite consent time';
end $$;

-- Students cannot promote themselves to admin, but can set their own role.
do $$ begin
  update public.profiles set role = 'admin' where id = '00000000-0000-0000-0000-000000000001';
  raise exception 'RLS check failed: student became admin';
exception when insufficient_privilege then raise notice 'ok - no self-promotion to admin';
end $$;

-- A student cannot add someone else to the class.
do $$ begin
  insert into public.class_members (class_id, student_id, mother_tongue, consented_at)
  values ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'en', now());
  raise exception 'RLS check failed: student inserted another member';
exception when insufficient_privilege then raise notice 'ok - no direct member inserts';
end $$;

-- Unknown code.
do $$ begin
  perform public.join_class('ZZZZZZ', 'vi');
  raise exception 'RLS check failed: unknown code accepted';
exception when no_data_found then raise notice 'ok - unknown invite code rejected';
end $$;
reset role;

-- Teacher A sees the roster and the student's profile; Teacher B sees neither.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check((select count(*) from public.class_members) = 1, 'teacher sees own roster');
select pg_temp.check((select count(*) from public.profiles) = 2, 'teacher sees own and student profiles');
do $$ begin
  perform public.join_class(current_setting('test.code'), 'vi');
  raise exception 'RLS check failed: teacher joined as student';
exception when insufficient_privilege then raise notice 'ok - teachers cannot join as students';
end $$;
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from public.classes) = 0, 'other teacher sees no classes');
select pg_temp.check((select count(*) from public.class_members) = 0, 'other teacher sees no roster');
select pg_temp.check((select count(*) from public.profiles) = 1, 'other teacher sees only own profile');
update public.classes set name = 'Đã đổi';
reset role;
select pg_temp.check(
  (select name from public.classes where id = '10000000-0000-0000-0000-000000000001') = 'Sơ cấp 1',
  'other teacher cannot rename the class');

-- Anonymous visitors see nothing and cannot join.
select pg_temp.act_as(null);
select pg_temp.check((select count(*) from public.classes) = 0, 'anon sees no classes');
do $$ begin
  perform public.join_class('ABCDEF', 'vi');
  raise exception 'RLS check failed: anon called join_class';
exception when insufficient_privilege then raise notice 'ok - anon cannot call join_class';
end $$;
reset role;

-- ===========================================================================
-- Lessons, segments, translations (migration 20261017100000)
-- ===========================================================================

-- Teacher A starts a live lesson in her class.
select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
insert into public.lessons (id, class_id, title, format, sources, target_langs)
values ('20000000-0000-0000-0000-000000000001', '10000000-0000-0000-0000-000000000001',
        'Bài 7', 'hybrid', '{mic,tab}', '{vi,zh,en}');
select pg_temp.check((select count(*) from public.lessons) = 1, 'teacher creates a lesson');

do $$ begin
  insert into public.lessons (class_id, title, format, sources)
  values ('10000000-0000-0000-0000-000000000001', 'Bài 8', 'room', '{mic}');
  raise exception 'RLS check failed: two live lessons in one class';
exception when unique_violation then raise notice 'ok - one live lesson per class';
end $$;

do $$ begin
  insert into public.lessons (class_id, title, format, sources, target_langs, status)
  values ('10000000-0000-0000-0000-000000000001', 'Bài 9', 'room', '{mic}',
          '{vi,zh,en,uz,ne,mn}', 'review');
  raise exception 'RLS check failed: more than 5 target languages accepted';
exception when check_violation then raise notice 'ok - at most 5 subtitle languages';
end $$;

-- A lesson still in review, which students must not see yet.
insert into public.lessons (id, class_id, title, format, sources, status)
values ('20000000-0000-0000-0000-000000000002', '10000000-0000-0000-0000-000000000001',
        'Bài 6', 'room', '{mic}', 'review');

insert into public.segments (id, lesson_id, seq, source, text, start_ms, end_ms) values
  ('30000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000001', 0, 'mic',
   '저는 한국 음식을 먹고 싶어요.', 34000, 36500),
  ('30000000-0000-0000-0000-000000000002', '20000000-0000-0000-0000-000000000002', 0, 'mic',
   '이 가방 좀 할인해 주세요.', 1000, 3000);
insert into public.segment_translations (segment_id, lang, text) values
  ('30000000-0000-0000-0000-000000000001', 'zh', '我想吃韩国料理。'),
  ('30000000-0000-0000-0000-000000000002', 'zh', '这个包请给我打个折。');
select pg_temp.check((select count(*) from public.segments) = 2, 'teacher reads all segments');

update public.segments set text = '저는 한국 음식을 먹고 싶어요!', edited = true
  where id = '30000000-0000-0000-0000-000000000001';
select pg_temp.check(
  (select edited from public.segments where id = '30000000-0000-0000-0000-000000000001'),
  'teacher corrects a segment');
reset role;

-- Student 1 (member) sees the live lesson only, with its segments and translations.
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check(
  (select array_agg(title) from public.lessons) = '{Bài 7}',
  'member sees live lessons, not ones in review');
select pg_temp.check((select count(*) from public.segments) = 1, 'member reads segments of live lessons');
select pg_temp.check(
  (select text from public.segment_translations) = '我想吃韩国料理。',
  'member reads translations of live lessons');
do $$ begin
  insert into public.segments (lesson_id, seq, source, text, start_ms, end_ms)
  values ('20000000-0000-0000-0000-000000000001', 1, 'mic', '가짜', 0, 1);
  raise exception 'RLS check failed: student wrote a segment';
exception when insufficient_privilege then raise notice 'ok - students cannot write segments';
end $$;
update public.lessons set status = 'published';
reset role;
select pg_temp.check(
  (select count(*) from public.lessons where status = 'published') = 0,
  'students cannot change lesson status');

-- Publishing the reviewed lesson makes it visible to the member.
update public.lessons set status = 'published' where id = '20000000-0000-0000-0000-000000000002';
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check((select count(*) from public.lessons) = 2, 'member sees a lesson once published');
reset role;

-- Student 2 (not a member), Teacher B and anon see nothing and cannot add lessons.
select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select pg_temp.check(
  (select count(*) from public.lessons) + (select count(*) from public.segments)
    + (select count(*) from public.segment_translations) = 0,
  'non-member sees no lessons, segments or translations');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check((select count(*) from public.lessons) = 0, 'other teacher sees no lessons');
do $$ begin
  insert into public.lessons (class_id, title, format, sources)
  values ('10000000-0000-0000-0000-000000000001', 'Xâm nhập', 'room', '{mic}');
  raise exception 'RLS check failed: other teacher created a lesson';
exception when insufficient_privilege then raise notice 'ok - other teacher cannot add lessons';
end $$;
reset role;

select pg_temp.act_as(null);
select pg_temp.check(
  (select count(*) from public.lessons) + (select count(*) from public.segments) = 0,
  'anon sees no lessons or segments');
reset role;

-- ---------------------------------------------------------------------------
-- Lesson materials (issue #13): the worker writes them with the service role while the
-- lesson is in review; only the teacher sees them until the lesson is published.
-- ---------------------------------------------------------------------------
insert into public.lessons (id, class_id, title, format, sources, target_langs, status)
values ('20000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001',
  'Bài 8', 'room', '{mic}', '{zh}', 'processing');
insert into public.segments (id, lesson_id, seq, source, text, start_ms, end_ms) values
  ('30000000-0000-0000-0000-000000000003', '20000000-0000-0000-0000-000000000003', 0, 'mic',
   '할인 좀 해 주세요.', 0, 1800);

set role service_role;
insert into public.lesson_summaries (lesson_id, lang, text) values
  ('20000000-0000-0000-0000-000000000003', 'ko', '할인을 요청하는 표현을 배웠어요.'),
  ('20000000-0000-0000-0000-000000000003', 'zh', '学习了请求打折的表达。');
insert into public.vocab_items (id, lesson_id, position, ko, pos, topik_level, example_ko, segment_id)
values ('40000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-000000000003', 0, '할인',
  'noun', 2, '할인 좀 해 주세요.', '30000000-0000-0000-0000-000000000003');
insert into public.vocab_translations (vocab_id, lang, meaning) values
  ('40000000-0000-0000-0000-000000000001', 'zh', '打折');
update public.lessons set status = 'review', processing_error = null
  where id = '20000000-0000-0000-0000-000000000003';
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-00000000000a');
select pg_temp.check(
  (select count(*) from public.lesson_summaries) = 2
    and (select count(*) from public.vocab_items) = 1
    and (select meaning from public.vocab_translations) = '打折',
  'teacher reads the materials of a lesson in review');
update public.vocab_items set topik_level = 1, edited = true
  where id = '40000000-0000-0000-0000-000000000001';
update public.lesson_summaries set text = '할인 표현', edited = true
  where lesson_id = '20000000-0000-0000-0000-000000000003' and lang = 'ko';
select pg_temp.check(
  (select topik_level from public.vocab_items) = 1
    and (select text from public.lesson_summaries where lang = 'ko') = '할인 표현',
  'teacher edits vocabulary and summary before publishing');
reset role;

select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check(
  (select count(*) from public.lesson_summaries) + (select count(*) from public.vocab_items)
    + (select count(*) from public.vocab_translations) = 0,
  'member does not see materials of a lesson in review');
do $$ begin
  insert into public.vocab_items (lesson_id, position, ko)
  values ('20000000-0000-0000-0000-000000000002', 0, '가짜');
  raise exception 'RLS check failed: student wrote vocabulary';
exception when insufficient_privilege then raise notice 'ok - students cannot write vocabulary';
end $$;
reset role;

update public.lessons set status = 'published' where id = '20000000-0000-0000-0000-000000000003';
select pg_temp.act_as('00000000-0000-0000-0000-000000000001');
select pg_temp.check(
  (select count(*) from public.lesson_summaries) = 2
    and (select ko from public.vocab_items) = '할인'
    and (select meaning from public.vocab_translations) = '打折',
  'member reads the materials once the lesson is published');
update public.vocab_items set ko = '가짜';
reset role;
select pg_temp.check(
  (select ko from public.vocab_items) = '할인', 'students cannot edit vocabulary');

select pg_temp.act_as('00000000-0000-0000-0000-000000000002');
select pg_temp.check(
  (select count(*) from public.lesson_summaries) + (select count(*) from public.vocab_items) = 0,
  'non-member sees no lesson materials');
reset role;
select pg_temp.act_as('00000000-0000-0000-0000-00000000000b');
select pg_temp.check(
  (select count(*) from public.vocab_translations) = 0, 'other teacher sees no lesson materials');
reset role;
