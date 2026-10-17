# Dasi (다시)

Dasi là web app AI hỗ trợ **dạy và học tiếng Hàn trong lớp đa ngôn ngữ**. Giáo viên giảng bằng tiếng Hàn; mỗi học sinh nhận phụ đề theo thời gian thực bằng tiếng mẹ đẻ của mình (Việt, Trung, Anh, Uzbek, Nepal, Mông Cổ, Thái…). Sau buổi học, AI tự tạo bản ghi song ngữ, từ vựng, ngữ pháp và bài tập để giáo viên duyệt rồi gửi cho lớp.

> Tên "Dasi" (다시) nghĩa là "lại lần nữa": nghe lại, ôn lại, hiểu từng câu.

**Trạng thái:** Giai đoạn 0 (nền tảng) · bắt đầu MVP · Prototype UI: [`design/prototype-v2.html`](design/prototype-v2.html) (mở trực tiếp bằng trình duyệt)

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
| LLM (dịch, trợ lý, tạo học liệu) | OpenAI, qua lớp `LlmProvider` |
| Monorepo | pnpm workspaces + Turborepo |
| Test | Vitest (unit), Playwright (e2e) |

Kiến trúc chi tiết: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md)

## Cấu trúc thư mục

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
│  ├─ tests/        # Kiểm tra RLS chạy trên Postgres thường
│  └─ seed.sql      # Dữ liệu mẫu (lớp, học sinh)
├─ scripts/         # test-db.sh
├─ design/          # Prototype UI và tài liệu thiết kế
├─ docs/            # Đặc tả, kiến trúc, roadmap
├─ .claude/         # Lệnh tuỳ chỉnh cho Claude Code
└─ CLAUDE.md        # Hướng dẫn cho Claude Code
```

## Bắt đầu

### Yêu cầu

- Node.js 20 LTS trở lên (khuyên dùng 22, xem `.nvmrc`), pnpm 10
- Tài khoản Supabase, hoặc [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started) + Docker để chạy local
- Redis (local qua Docker, hoặc Upstash)
- OpenAI API key (dịch và tạo học liệu). Chưa có khoá vẫn chạy được: mặc định `STT_PROVIDER=mock`, `LLM_PROVIDER=mock`

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

Worker cần Redis (`REDIS_URL`). Realtime gateway có `GET /health` ở cổng `REALTIME_PORT` (mặc định 8787).

Mở http://localhost:3000. Dữ liệu mẫu trong `supabase/seed.sql` (lớp mẫu có mã mời `HANGUL`).

### Kết nối Supabase Cloud

Project hiện tại: `qcqqadflhiqxjkaizohc` (URL `https://qcqqadflhiqxjkaizohc.supabase.co`).

1. **Tạo bảng:** Supabase Dashboard → SQL Editor → dán toàn bộ nội dung từng file trong `supabase/migrations/` (theo thứ tự tên file) → Run. Không chạy `seed.sql` trên project thật.
2. **Bật đăng nhập Google:**
   - Google Cloud Console → APIs & Services → Credentials → tạo OAuth client ID loại *Web application*, thêm Authorized redirect URI `https://qcqqadflhiqxjkaizohc.supabase.co/auth/v1/callback`.
   - Supabase → Authentication → Sign In / Providers → Google → bật, dán Client ID và Client Secret.
   - Supabase → Authentication → URL Configuration: Site URL là địa chỉ web app (ví dụ `http://localhost:3000`), thêm `http://localhost:3000/auth/callback` (và địa chỉ deploy, ví dụ `https://<tên>.vercel.app/auth/callback`) vào Redirect URLs.
3. **Điền `.env.local`:** `NEXT_PUBLIC_SUPABASE_URL` và `NEXT_PUBLIC_SUPABASE_ANON_KEY` (Project Settings → API Keys, khoá *anon* hoặc *publishable*). Khoá này công khai được vì mọi bảng có RLS. `SUPABASE_SERVICE_ROLE_KEY` chỉ đặt ở server, không bao giờ để trong code phía trình duyệt.

### Dùng OpenAI

Đặt trong `.env.local` (hoặc biến môi trường của nơi deploy), không commit, không dán vào issue hay chat:

```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_MODEL_FAST=<model nhanh, dùng cho dịch realtime>
LLM_MODEL_QUALITY=<model tốt hơn, dùng cho học liệu sau buổi học>
```

Realtime gateway và worker báo lỗi ngay khi khởi động nếu thiếu một trong các biến trên.

### Lệnh thường dùng

| Lệnh | Việc làm |
| --- | --- |
| `pnpm dev` | Chạy toàn bộ app ở chế độ phát triển |
| `pnpm build` | Build tất cả app |
| `pnpm lint` / `pnpm typecheck` | Kiểm tra code |
| `pnpm test` | Unit test (Vitest) |
| `pnpm test:e2e` | E2E test (Playwright, máy tính + 390px) |
| `DATABASE_URL=… pnpm test:db` | Chạy migration + seed + kiểm tra RLS trên một database Postgres trống |
| `pnpm format` | Định dạng code bằng Prettier |
| `pnpm db:migrate` / `pnpm db:seed` | Chạy migration / reset database local và nạp dữ liệu mẫu (cần Supabase CLI) |

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
