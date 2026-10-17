# Roadmap

Mỗi mục là một issue GitHub. Đánh dấu khi đã merge. Mã trong ngoặc tham chiếu `SPEC.md`.

## Giai đoạn 0 · Nền tảng (tuần 1)

- [x] Khởi tạo monorepo pnpm + Turborepo: `apps/web`, `apps/realtime`, `apps/worker`, `packages/{providers,shared,i18n}`
- [x] ESLint, Prettier, TypeScript strict, Vitest, Playwright
- [x] GitHub Actions: lint + typecheck + test cho mỗi PR (kèm build, e2e, kiểm tra migration + RLS)
- [x] Migration đầu tiên (`profiles`, `classes`, `class_members`) + RLS
- [x] Tạo Supabase project (`qcqqadflhiqxjkaizohc`)
- [ ] Chạy migration trên project, bật Google provider (README → Kết nối Supabase Cloud)
- [x] Design tokens và layout từ `design/prototype-v2.html` vào Tailwind config
- [ ] Spike STT: so sánh Soniox / Return Zero / CLOVA / Deepgram trên 3 đoạn ghi âm lớp thật (độ trễ, lỗi nhận dạng) → ghi kết quả vào `docs/decisions/001-stt-provider.md`

## Giai đoạn 1 · MVP (tuần 2–6)

- [x] Đăng nhập Google, chọn vai trò, chọn tiếng mẹ đẻ (A1–A3)
- [x] Tạo lớp, mã mời + QR, vào lớp bằng mã (C1–C3)
- [x] Chi tiết lớp: tab Học sinh, Buổi học (C4) · tab Từ vựng và Cài đặt làm sau
- [x] Tạo buổi học 3 bước với kiểm tra thiết bị (mục 3, P0) · "nói thử một câu" chờ realtime (#7), ước tính phút AI chờ #16
- [x] Adapter STT OpenAI realtime transcription (`STT_PROVIDER=openai`) · chưa đo độ trễ thật, xem `docs/decisions/001-stt-provider.md`
- [x] Realtime gateway: WebSocket, SttProvider, partial/final, lưu segment (#7)
- [x] Dịch song song final segment sang ngôn ngữ của lớp (VI, ZH, EN) (#8)
- [x] Màn hình lớp trực tiếp cho giáo viên (L1–L5) · panel Trợ lý, chế độ chiếu, mời học sinh làm sau
- [x] Màn hình lớp trực tiếp cho học sinh trên điện thoại, tra từ (S2, S3) · nút Lưu vào Sổ từ chờ bảng `saved_words`
- [x] Worker `lesson.finalize`: tóm tắt + trích từ vựng · ngữ pháp và bài tập làm sau
- [x] Chi tiết buổi học, duyệt và gửi cho lớp (D1–D3) · trình phát và bấm câu để tua chờ có bản ghi âm
- [ ] Trang chủ học sinh, xem lại buổi học (S1, S6)
- [ ] Đếm phút STT và token LLM theo buổi (`usage_events`)

## Giai đoạn 2 · Thử nghiệm với lớp thật (tuần 7–9)

- [ ] Onboarding 3 bước cho giáo viên + buổi học mẫu
- [ ] Sửa câu nhận sai, từ điển lớp (D4)
- [ ] Ghi tiếp khi mất mạng (L13)
- [ ] Đo độ trễ thực tế, tỷ lệ lỗi; khảo sát giáo viên và học sinh
- [ ] Trang Chính sách quyền riêng tư, Điều khoản; gửi Google xác minh OAuth

## Giai đoạn 3 · Học tập (tuần 10–15)

- [ ] Giữ để hỏi, Chưa hiểu, câu hỏi nhanh (S4, S5, L6, L10)
- [ ] Tô màu ngữ pháp, chế độ chiếu TV, trợ lý giảng dạy (L7–L9)
- [ ] Bài tập: tạo, giao, làm bài, chấm (D5, S9)
- [ ] Sổ từ, flashcard, tiến độ (S7, S8, S11)
- [ ] Thống kê theo nhóm ngôn ngữ (mục 6)
- [ ] Ngôn ngữ đợt 2 ở chế độ Beta: uz, ru, ne, mn, th

## Giai đoạn 4 · Mở rộng

- [ ] Luyện hội thoại với AI (S10)
- [ ] Vai trò Quản lý trung tâm, báo cáo PDF (A4)
- [ ] Gói dịch vụ và thanh toán (VN: MoMo/VNPay · KR: Toss, thẻ)
- [ ] Tích hợp Google Classroom, Zoom
- [ ] Luyện thi TOPIK
