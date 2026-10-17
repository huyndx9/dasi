-- Sample data for local development. All names are fictional (PRIVACY.md).
-- These users have no password: sign in with Google, then use the data through
-- the service role or by joining the class with invite code HANGUL.

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-4000-8000-00000000000a', 'teacher.kim@example.com', '{"full_name": "Cô Kim"}'),
  ('00000000-0000-4000-8000-000000000001', 'student.lan@example.com', '{"full_name": "Lan"}'),
  ('00000000-0000-4000-8000-000000000002', 'student.wei@example.com', '{"full_name": "Wei"}'),
  ('00000000-0000-4000-8000-000000000003', 'student.sam@example.com', '{"full_name": "Sam"}');

update public.profiles set role = 'teacher', ui_lang = 'vi'
  where id = '00000000-0000-4000-8000-00000000000a';
update public.profiles as p set role = 'student', mother_tongue = v.lang
  from (values
    ('00000000-0000-4000-8000-000000000001'::uuid, 'vi'),
    ('00000000-0000-4000-8000-000000000002'::uuid, 'zh'),
    ('00000000-0000-4000-8000-000000000003'::uuid, 'en')
  ) as v (id, lang)
  where p.id = v.id;

insert into public.classes (id, teacher_id, name, level, schedule, textbook, invite_code) values
  ('10000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-00000000000a',
   'Sơ cấp 1 · Tối T3-T5', 'TOPIK 1', 'Thứ 3, Thứ 5 · 19:00', '서울대 한국어 1A', 'HANGUL');

insert into public.class_members (class_id, student_id, mother_tongue, consented_at)
select '10000000-0000-4000-8000-000000000001', id, mother_tongue, now()
from public.profiles
where role = 'student';
