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

-- A published lesson with a short bilingual transcript.
insert into public.lessons (id, class_id, title, topic, textbook, format, sources, target_langs, status, started_at, ended_at)
values ('20000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001',
        'Bài 7 – Mua sắm', '-고 싶다, -아/어서', '세종한국어 2', 'hybrid', '{mic,tab}', '{vi,zh,en}',
        'published', now() - interval '2 days', now() - interval '2 days' + interval '42 minutes');

insert into public.segments (id, lesson_id, seq, source, speaker_label, text, start_ms, end_ms) values
  ('30000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', 0, 'mic', 'Cô Kim',
   '안녕하세요 여러분, 오늘은 -고 싶다를 배워 볼까요?', 12000, 15500),
  ('30000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 1, 'mic', 'Cô Kim',
   '저는 한국 음식을 먹고 싶어요.', 34000, 36500),
  ('30000000-0000-4000-8000-000000000003', '20000000-0000-4000-8000-000000000001', 2, 'mic', 'Cô Kim',
   '배가 아파서 병원에 갔어요.', 102000, 105000);

insert into public.segment_translations (segment_id, lang, text) values
  ('30000000-0000-4000-8000-000000000001', 'vi', 'Xin chào cả lớp, hôm nay mình học -고 싶다 nhé?'),
  ('30000000-0000-4000-8000-000000000001', 'zh', '大家好，今天我们来学 -고 싶다 吧？'),
  ('30000000-0000-4000-8000-000000000001', 'en', 'Hi everyone, shall we learn -고 싶다 today?'),
  ('30000000-0000-4000-8000-000000000002', 'vi', 'Tôi muốn ăn món Hàn.'),
  ('30000000-0000-4000-8000-000000000002', 'zh', '我想吃韩国料理。'),
  ('30000000-0000-4000-8000-000000000002', 'en', 'I want to eat Korean food.'),
  ('30000000-0000-4000-8000-000000000003', 'vi', 'Vì đau bụng nên tôi đã đi bệnh viện.'),
  ('30000000-0000-4000-8000-000000000003', 'zh', '因为肚子疼，所以去了医院。'),
  ('30000000-0000-4000-8000-000000000003', 'en', 'My stomach hurt, so I went to the hospital.');
