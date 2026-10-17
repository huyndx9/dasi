# Quyền riêng tư & dữ liệu

Dasi ghi âm giọng nói giáo viên và học sinh, nên quyền riêng tư là yêu cầu sản phẩm, không phải phần làm thêm. Tài liệu này là nguyên tắc kỹ thuật, không thay cho tư vấn pháp lý.

## Luật áp dụng

- **Hàn Quốc:** Luật Bảo vệ thông tin cá nhân (PIPA, 개인정보 보호법). Người dưới 14 tuổi cần người đại diện hợp pháp đồng ý.
- **Việt Nam:** Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.
- Nhà cung cấp AI ở nước ngoài → phải ghi rõ việc chuyển dữ liệu ra nước ngoài trong chính sách.

## Quy tắc trong sản phẩm

| Quy tắc | Cách thực hiện |
| --- | --- |
| Thông báo trước khi ghi | Bước 3 của "Buổi học mới" có ghi chú đồng ý; học sinh thấy biểu tượng REC suốt buổi |
| Học sinh đồng ý khi vào lớp | Màn hình vào lớp có ô đồng ý ghi âm và xử lý bằng AI; lưu `consented_at` trong `class_members` |
| Thu tối thiểu | Không lưu audio của "Giữ để hỏi" sau khi đã nhận dạng xong |
| Thời hạn lưu | Mặc định xoá audio sau 90 ngày (giáo viên chỉnh trong cài đặt lớp); văn bản giữ đến khi lớp bị xoá |
| Quyền của người dùng | Xuất và xoá dữ liệu cá nhân trong trang Cài đặt |
| Phân quyền | RLS: học sinh chỉ thấy lớp của mình; service role chỉ dùng ở server |
| Không huấn luyện AI | Chỉ dùng nhà cung cấp có chế độ không dùng dữ liệu để huấn luyện; ghi trong chính sách |
| Giọng nói sinh trắc học | Chưa làm trong MVP. Nếu làm: đồng ý riêng, xoá được bất cứ lúc nào |

## Dữ liệu phát triển

- Không dùng ghi âm hoặc tên học sinh thật trong seed, test, ảnh chụp màn hình, issue.
- Ghi âm dùng để test STT phải có sự đồng ý của người nói và lưu ngoài repo.

## Trước khi ra mắt

- [ ] Trang Chính sách quyền riêng tư (VI, KO, EN) và Điều khoản sử dụng
- [ ] Danh sách bên xử lý dữ liệu (Supabase, nhà cung cấp STT, LLM, hosting) và nơi lưu trữ
- [ ] Gửi Google xác minh OAuth (dùng scope `drive.file` nếu có xuất Drive)
- [ ] Quy trình xử lý yêu cầu xoá dữ liệu
