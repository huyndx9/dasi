# Làm việc nhóm với nhiều Claude

Dự án chạy song song nhiều phiên Claude Code (ví dụ hai tài khoản Claude của cùng một người, hoặc của hai người). Các Claude không nói chuyện trực tiếp với nhau, nên **GitHub là nơi chung**: issue là danh sách việc, comment là kênh trao đổi, nhãn cho biết Claude nào đang làm gì.

Các phiên có thể dùng **chung một tài khoản GitHub**, nên GitHub login không phân biệt được ai với ai. Mỗi Claude vì vậy có một **tên tác tử** (`A`, `B`, …):

- Đặt bằng biến môi trường `DASI_AGENT=A` (cài đặt môi trường cloud của từng tài khoản, hoặc shell trên máy), hoặc nêu trong prompt khởi động ("Bạn là Claude A").
- Nhãn `agent:A` trên issue = Claude A đang giữ việc đó.
- Comment do Claude viết luôn mở đầu bằng tên mình, ví dụ `🔒 Nhận việc — Claude A`.

## Một phiên làm việc

| Khi nào | Lệnh | Việc Claude làm |
| --- | --- | --- |
| Bắt đầu | `/standup` | Đọc hộp thư, rồi đọc GitHub: Claude nào giữ việc gì, PR nào chờ review, việc nào sẵn sàng. |
| Nhận việc | `/claim-task` hoặc `/claim-task 8` | Chọn việc sẵn sàng không đụng thư mục của Claude khác, gắn nhãn `agent:<tên>`, comment nhận việc, tạo nhánh. |
| Làm việc | `/new-feature #8`, `/pre-pr` | Như cũ. Mở PR nháp sớm với `Closes #8` để Claude kia thấy file nào đang bị sửa. |
| Nhắn Claude kia | `/message B <nội dung>` | Đăng tin lên **📡 Kênh agent** (#18). |
| Đọc tin | `/inbox` | Đọc tin gửi cho mình chưa xử lý, trả lời, cập nhật mốc đã đọc. Nên chạy sau mỗi bước lớn. |
| Kết thúc | `/handoff` (hoặc `/handoff nhả`) | Push code dở, comment bàn giao; nếu nhả thì bỏ nhãn `agent:<tên>` để việc về `status:ready`. |

## Luật chia việc

1. **Một issue = một Claude = một nhánh = một PR.** Chỉ làm issue mang nhãn `agent:<tên mình>`. Việc chưa có issue thì tạo issue trước (mẫu "Việc").
2. **Nhận việc:** gắn nhãn `agent:<tên>`, gán issue cho tài khoản GitHub đang dùng, rồi comment `🔒 Nhận việc — Claude <tên> — <giờ UTC> — nhánh <nhánh>`.
3. **Nhận trùng:** nếu hai Claude cùng nhận một issue, **comment nhận việc sớm hơn thắng**; Claude sau bỏ nhãn của mình, comment `🔓 Nhả việc — Claude <tên> — nhận trùng` và chọn việc khác.
4. **Không nhận việc bị khoá.** Issue có dòng `Phụ thuộc: #4, #7` mang nhãn `status:blocked` cho đến khi các issue đó đóng; GitHub Action tự mở khoá và comment báo.
5. **Không chồng thư mục.** Mỗi issue có nhãn `area:*` và dòng `Thư mục chính`. Không nhận việc có thư mục trùng (cùng thư mục, hoặc thư mục cha/con) với việc Claude khác đang giữ hay với PR đang mở của Claude khác. Riêng `area:db` (migration): **mỗi lúc chỉ một Claude**.
6. **Việc của chủ dự án** (nhãn `owner-action`: tài khoản, khoá API, cài đặt dịch vụ) không Claude nào tự nhận.

## Trạng thái (tự động)

| Nhãn | Nghĩa | Đổi khi |
| --- | --- | --- |
| `status:ready` | Nhận được | Tạo issue không có phụ thuộc mở; bỏ gán; phụ thuộc đóng hết |
| `status:blocked` | Chờ issue khác | Còn issue ở dòng `Phụ thuộc` đang mở |
| `status:in-progress` | Đang có Claude làm | Gán issue; PR quay về nháp hoặc bị đóng không merge |
| `status:review` | Có PR chờ review | PR (không nháp) có `Closes #<số>` |

Logic: `.github/scripts/task-status.cjs` (test: `pnpm test:scripts`), chạy bởi `.github/workflows/task-status.yml` sau khi workflow này có trên `main`.

## Tránh xung đột code

- **Nhánh:** `feat/<số-issue>-<mô-tả>` (hoặc `fix/`, `docs/`, `chore/`), tạo từ `origin/main` mới nhất. Trong phiên cloud, prompt khởi động cho phép Claude dùng tên nhánh này thay cho nhánh mặc định của phiên.
- **Cập nhật `main` thường xuyên** vào nhánh của mình bằng `git merge origin/main`; không rebase nhánh đã push.
- **File hay đụng nhau:** `packages/i18n/src/*.json` (thêm khoá mới theo nhóm của màn hình mình, không sắp xếp lại cả file), `pnpm-lock.yaml` (khi xung đột chạy lại `pnpm install`, không sửa tay), `apps/web/src/lib/supabase/database.types.ts` và `docs/ROADMAP.md` (chỉ sửa phần của việc mình).
- **Migration:** tên file `YYYYMMDDHHMMSS_<mô-tả>.sql`; chỉ một việc `area:db` chạy cùng lúc.
- **Review chéo:** Claude này review PR của Claude kia (comment `🔍 Claude B review: …`); chủ dự án là người merge. Không merge khi CI đỏ.

## Kênh agent

Mọi tin nhắn giữa các Claude đi qua một issue cố định: **📡 Kênh agent** (#18).

| Loại | Định dạng (dòng đầu comment) | Ai viết |
| --- | --- | --- |
| Tin nhắn | `📨 A → B · <chủ đề>` (hoặc `→ tất cả`), cuối tin: `Liên quan: #8 · Cần trả lời: có` | `/message` |
| Trả lời | `↩️ B → A · re: <link comment>` | `/inbox` |
| Mốc đã đọc | `📭 Hộp thư B — đã đọc đến <ISO time>` (một comment mỗi agent, được sửa lại mỗi lần đọc) | `/inbox` |

- **Tin phải tự đủ ngữ cảnh:** Claude nhận không biết gì về phiên của Claude gửi, nên ghi rõ số issue/PR, file, hàm, và cần gì.
- **Khi nào đọc:** đầu phiên (`/standup` tự gọi `/inbox`), trước khi nhận việc (`/claim-task` tự gọi), sau mỗi bước lớn, và trước `/handoff`. Phiên chạy lâu có thể dùng `/loop 30m /inbox`.
- **Báo gấp:** nếu Claude nhận đang có PR mở, `/message` đăng thêm tin lên PR đó; phiên cloud đang theo dõi PR sẽ được đánh thức ngay.
- **Việc chung, thông báo cho chủ dự án, stand-up:** **📋 Bảng tin nhóm** (#2). Quyết định đã chốt thì ghi vào `docs/`.
- **Chủ dự án** comment ở #18 hoặc #2 và ghi tên agent ("Claude A, …"); agent đó thấy ở lần `/inbox` tiếp theo.

## Chia làn mặc định

| Tác tử | Làn | Nhãn ưu tiên |
| --- | --- | --- |
| Claude A | Hệ thống: dữ liệu, realtime, worker, nhà cung cấp AI | `area:db`, `area:realtime`, `area:worker`, `area:providers` |
| Claude B | Giao diện: tạo buổi học, lớp trực tiếp, chi tiết buổi học, trang học sinh, e2e | `area:web` |

`/claim-task` ưu tiên làn của mình nhưng vẫn nhận việc làn khác khi làn mình hết việc sẵn sàng (và không trùng thư mục). Thêm Claude thứ ba: đặt tên `C`, chia lại làn trong bảng này.
