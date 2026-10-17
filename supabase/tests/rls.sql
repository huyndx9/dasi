-- RLS checks for profiles, classes, class_members. Runs after auth-stub.sql and
-- all migrations; any failed check raises and stops psql (ON_ERROR_STOP).

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
