# Đóng góp

## Nhánh

- `main`: luôn chạy được, chỉ merge qua Pull Request.
- Nhánh làm việc: `feat/<số-issue>-<mô-tả-ngắn>` (hoặc `fix/`, `docs/`, `chore/`). Mỗi nhánh gắn với một issue đã nhận bằng `/claim-task`; quy trình nhóm ở [`docs/TEAM.md`](docs/TEAM.md).

## Commit

Theo [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(realtime): dịch song song final segment sang ngôn ngữ của lớp
fix(web): nút Bắt đầu không mở khoá sau khi chọn tab
docs: cập nhật LANGUAGES.md với số liệu mới
```

Phạm vi gợi ý: `web`, `realtime`, `worker`, `providers`, `shared`, `i18n`, `db`, `ci`.

## Pull Request

1. Mỗi PR giải quyết một issue, ghi `Closes #<số>`.
2. Chạy trước khi mở PR: `pnpm lint && pnpm typecheck && pnpm test`.
3. Thay đổi UI: đính kèm ảnh chụp ở máy tính và 390px, chế độ sáng và tối.
4. Thay đổi DB: thêm migration mới trong `supabase/migrations/` kèm RLS; không sửa migration đã chạy.
5. Thay đổi env: cập nhật `.env.example` và `docs/ARCHITECTURE.md`.

## Làm việc với Claude Code

- Claude Code đọc `CLAUDE.md`. Cập nhật file đó khi quy ước thay đổi.
- Dùng `/new-feature`, `/add-language`, `/pre-pr` trong `.claude/commands/`.
- Luôn tự đọc lại diff do Claude tạo trước khi commit.

## Bảo mật

Không commit khoá API, file `.env.local`, ghi âm hoặc dữ liệu học sinh thật. Phát hiện lỗ hổng: báo riêng cho người quản lý repo, không mở issue công khai.
