# Dasi (다시)

Dasi là web app AI hỗ trợ **dạy và học tiếng Hàn trong lớp đa ngôn ngữ**. Giáo viên giảng bằng tiếng Hàn; mỗi học sinh nhận phụ đề theo thời gian thực bằng tiếng mẹ đẻ của mình (Việt, Trung, Anh, Uzbek, Nepal, Mông Cổ, Thái…). Sau buổi học, AI tự tạo bản ghi song ngữ, từ vựng, ngữ pháp và bài tập để giáo viên duyệt rồi gửi cho lớp.

> Tên "Dasi" (다시) nghĩa là "lại lần nữa": nghe lại, ôn lại, hiểu từng câu.

**Trạng thái:** đang chuẩn bị MVP · Prototype UI: [`design/prototype-v2.html`](design/prototype-v2.html) (mở trực tiếp bằng trình duyệt)

---

## Tính năng chính

| Giáo viên | Học sinh |
| --- | --- |
| Tạo lớp, mã mời / QR, học sinh tự chọn tiếng mẹ đẻ | Vào lớp bằng mã, chọn tiếng mẹ đẻ |
| Tạo buổi học 3 bước: lớp & hình thức → âm thanh & phụ đề → kiểm tra thiết bị | Xem phụ đề Hàn + bản dịch trên điện thoại, chạm từ để tra nghĩa |
| Lớp trực tiếp: phụ đề song song nhiều ngôn ngữ, tô màu ngữ pháp, chế độ chiếu TV | "Giữ để hỏi" bằng tiếng mẹ đẻ, giáo viên nhận bản tiếng Hàn |
| Câu hỏi của học sinh, nút "Chưa hiểu", câu hỏi nhanh cho cả lớp | Sổ từ, flashcard lặp lại ngắt quãng, bài tập có giải thích bằng tiếng mẹ đẻ |
| Sau buổi học: bản ghi, từ vựng, ngữ pháp, bài tập do AI tạo → duyệt → giao | Xem lại buổi học, bấm vào câu để nghe đúng đoạn |
| Thống kê theo nhóm ngôn ngữ, lỗi hay gặp, học sinh cần hỗ trợ | Theo dõi tiến độ, cấp TOPIK ước tính |

Đặc tả đầy đủ: [`docs/SPEC.md`](docs/SPEC.md)

## Ngôn ngữ hỗ trợ

| Đợt | Ngôn ngữ | Trạng thái |
| --- | --- | --- |
| 1 (MVP) | Tiếng Việt, 中文简体, English | Mở chính thức |
| 2 | Oʻzbekcha + Русский, नेपाली, Монгол, ไทย | Beta |
| 3 | Indonesia, Tagalog, ខ្មែរ, မြန်မာ, 日本語 | Theo nhu cầu |

Lý do chọn và quy trình thêm ngôn ngữ: [`docs/LANGUAGES.md`](docs/LANGUAGES.md)

## Tech stack

| Phần | Công nghệ |
| --- | --- |
| Web app | Next.js (App Router) · TypeScript · Tailwind CSS · shadcn/ui |
| Đăng nhập & dữ liệu | Supabase: Google OAuth, PostgreSQL + Row Level Security, Storage |
| Realtime gateway | Node.js (Fastify + WebSocket), chạy riêng vì cần kết nối lâu |
| Xử lý nền | BullMQ + Redis |
| Nhận giọng nói + dịch realtime | Soniox (mặc định), qua lớp `SttProvider` để đổi nhà cung cấp |
| LLM (trợ lý, tạo học liệu) | Claude / Gemini, qua lớp `LlmProvider` |
| Monorepo | pnpm workspaces + Turborepo |
| Test | Vitest (unit), Playwright (e2e) |

Kiến trúc chi tiết: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Cấu trúc thư mục (dự kiến)

```
dasi/
├─ apps/
│  ├─ web/          # Next.js: giao diện giáo viên + học sinh, API routes
│  ├─ realtime/     # WebSocket gateway: nhận audio, gọi STT, phát phụ đề
│  └─ worker/       # Job sau buổi học: tóm tắt, từ vựng, bài tập
├─ packages/
│  ├─ providers/    # SttProvider, LlmProvider, TtsProvider + adapter
│  ├─ shared/       # Kiểu dữ liệu, schema (zod), hằng số ngôn ngữ
│  └─ i18n/         # Chuỗi giao diện theo ngôn ngữ
├─ supabase/
│  ├─ migrations/   # SQL migration + RLS policy
│  └─ seed.sql      # Dữ liệu mẫu (lớp, học sinh, buổi học)
├─ design/          # Prototype UI và tài liệu thiết kế
├─ docs/            # Đặc tả, kiến trúc, roadmap
├─ .claude/         # Lệnh tuỳ chỉnh cho Claude Code
└─ CLAUDE.md        # Hướng dẫn cho Claude Code
```

## Bắt đầu

### Yêu cầu

- Node.js 20 LTS trở lên, pnpm 9
- Tài khoản Supabase (hoặc Supabase CLI để chạy local)
- Redis (local qua Docker, hoặc Upstash)
- API key: Soniox, Anthropic (hoặc Google AI)

### Cài đặt

```bash
git clone https://github.com/<your-account>/dasi.git
cd dasi
pnpm install
cp .env.example .env.local      # điền các khoá cần thiết
pnpm supabase start              # Supabase local (cần Docker)
pnpm db:migrate && pnpm db:seed
pnpm dev                         # chạy web + realtime + worker
```

Mở http://localhost:3000. Tài khoản mẫu trong `supabase/seed.sql`.

### Lệnh thường dùng

| Lệnh | Việc làm |
| --- | --- |
| `pnpm dev` | Chạy toàn bộ app ở chế độ phát triển |
| `pnpm build` | Build tất cả app |
| `pnpm lint` / `pnpm typecheck` | Kiểm tra code |
| `pnpm test` | Unit test (Vitest) |
| `pnpm test:e2e` | E2E test (Playwright) |
| `pnpm db:migrate` / `pnpm db:seed` | Chạy migration / nạp dữ liệu mẫu |

## Làm việc với Claude Code

1. Cài Claude Code, mở terminal ở thư mục dự án và chạy `claude`.
2. Claude Code tự đọc [`CLAUDE.md`](CLAUDE.md): stack, quy ước, lệnh, định nghĩa "xong".
3. Lệnh tuỳ chỉnh có sẵn trong `.claude/commands/`:
   - `/new-feature <mô tả>`: lập kế hoạch → code → test cho một tính năng
   - `/add-language <mã>`: thêm một ngôn ngữ phụ đề mới theo checklist
   - `/pre-pr`: tự kiểm tra thay đổi trước khi mở PR
4. Gợi ý bắt đầu: *"Đọc docs/SPEC.md và docs/ROADMAP.md, dựng khung monorepo theo Giai đoạn 1."*

## Đóng góp

Xem [`CONTRIBUTING.md`](CONTRIBUTING.md): quy ước nhánh, commit, PR.

## Quyền riêng tư

Dasi ghi âm giọng nói giáo viên và học sinh. Mọi buổi học phải hiển thị thông báo và xin đồng ý trước khi ghi. Tuân thủ PIPA (Hàn Quốc) và Nghị định 13/2023 (Việt Nam). Chi tiết: [`docs/PRIVACY.md`](docs/PRIVACY.md)

## Giấy phép

Chưa chọn. Mặc định giữ mọi quyền cho đến khi có quyết định.
