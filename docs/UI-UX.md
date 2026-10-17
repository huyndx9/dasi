# UI / UX

Prototype tham chiếu: [`design/prototype-v2.html`](../design/prototype-v2.html). Mở bằng trình duyệt; nút "Giáo viên / Học sinh" ở góc trên để đổi vai trò, nút wifi để giả lập mất mạng.

## Nguyên tắc

1. **Phụ đề là thứ dễ đọc nhất trên màn hình.** Không đặt gì đè lên phụ đề; chữ tiếng Hàn ≥ 18px trên máy tính, ≥ 22px trên điện thoại.
2. **Trạng thái thể hiện bằng hình, không chỉ bằng chữ:** chấm REC nhấp nháy, câu đang nghe chữ nghiêng xám, nhãn Beta màu vàng, viền đỏ cho câu hỏi mới.
3. **Mỗi ngôn ngữ có một màu cố định** (chấm màu + mã `VI`, `ZH`…). Không dùng emoji cờ: Windows không hiển thị.
4. **Giáo viên dùng máy tính, học sinh dùng điện thoại.** Thiết kế màn hình học sinh từ 390px trở lên.
5. **Mọi thao tác bất đồng bộ có đủ 4 trạng thái:** đang tải, trống, thành công, lỗi (lỗi nói rõ cách sửa).
6. Thanh mất mạng chỉ hiện khi mất mạng thật. Thông báo (toast) tự tắt sau ~2,5 giây.

## Design tokens

| Token | Sáng | Tối | Dùng cho |
| --- | --- | --- | --- |
| `--bg` | `#F3F6FB` | `#0D1320` | Nền trang |
| `--surface` | `#FFFFFF` | `#151D2E` | Thẻ, panel |
| `--sunk` | `#EAEFF7` | `#1C2639` | Nền chip, ô nhập |
| `--line` | `#DCE3EE` | `#2A3550` | Viền |
| `--fg` / `--muted` / `--faint` | `#16223B` / `#5B6884` / `#8A95AD` | `#E7ECF5` / `#A1ACC3` / `#717D98` | Chữ |
| `--primary` | `#1B2A4A` | `#E7ECF5` | Nút chính |
| `--live` | `#E8573A` | `#FF7759` | Ghi âm, trực tiếp, kết thúc |
| `--learn` | `#0F9471` | `#3CC79E` | Học tập, tiến độ, thành công |
| `--warn` | `#B86E00` | `#F0B44C` | Beta, cảnh báo |
| `--hl` | `#FFE8A3` | `#5B4A12` | Tô màu ngữ pháp |

Màu ngôn ngữ: `vi #D9443A` · `zh #C98A0B` · `en #2F6FD6` · `uz #169C8C` · `ne #8A4FD0` · `mn #C2417F` · `th #3B8F3E` · `ru #5A6C8F` (bản tối sáng hơn, xem prototype).

Font: **Be Vietnam Pro** (giao diện) · **Noto Sans KR** (tiếng Hàn) · **IBM Plex Mono** (giờ, mã lớp, số liệu) · Noto Sans Devanagari / Thai / Khmer / Myanmar.

## Màn hình

| Màn hình | Vai trò | Ghi chú chính |
| --- | --- | --- |
| Đăng nhập | Cả hai | 2 bước: Google → chọn vai trò |
| Lớp của tôi | GV | Thẻ lớp có thanh phân bố ngôn ngữ; chọn thẻ → chi tiết lớp bên dưới ghi rõ "Đang xem" |
| Buổi học mới | GV | Modal 3 bước có thanh tiến trình; nút Bắt đầu khoá đến khi nguồn sẵn sàng |
| Lớp trực tiếp | GV | Thanh điều khiển trên; feed câu bên trái; panel tab Câu hỏi / Trợ lý / Từ vựng bên phải (xuống dưới khi < 1100px) |
| Chế độ chiếu | GV | Toàn màn hình nền tối, chữ lớn, Esc để thoát |
| Đang xử lý | GV | Danh sách bước có trạng thái |
| Chi tiết buổi học | GV | Trình phát + dòng thời gian slide; tab bản ghi, từ vựng, ngữ pháp, tóm tắt, câu hỏi |
| Bài tập | GV | Form bên trái, xem trước bên phải |
| Thống kê | GV | Biểu đồ thanh có trục 0–100%, bảng lỗi theo nhóm, học sinh cần hỗ trợ |
| Trang chủ | HS | Thẻ "đang dạy" ở đầu, ô Ôn hôm nay / Bài tập, chọn tiếng mẹ đẻ |
| Lớp trực tiếp | HS | 3 câu gần nhất, câu cũ mờ; tra từ; "Chưa hiểu" + "Giữ để hỏi" cố định cuối |
| Sổ từ / Ôn tập / Tiến độ | HS | Flashcard lật, nút Đã nhớ / Chưa nhớ |

## Phím tắt (giáo viên)

`N` buổi học mới · `Space` tạm dừng · `S` lưu câu hiện tại · `Esc` đóng hộp thoại / thoát chế độ chiếu

## Câu chữ

- Tiếng Việt, ngắn, nói rõ việc xảy ra: "Bắt đầu buổi học", "Đã gửi câu hỏi. Cô Kim nhận bản tiếng Hàn."
- Lỗi nói nguyên nhân và cách sửa: "Tab này không chia sẻ âm thanh. Chọn lại và tích 'Chia sẻ âm thanh tab'."
- Không để chữ kỹ thuật lọt ra giao diện (mock, tooltip, verification…).
