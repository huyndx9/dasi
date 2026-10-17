# Đặc tả tính năng

Dasi giúp giáo viên dạy tiếng Hàn cho lớp có học sinh nhiều quốc tịch: phụ đề tiếng mẹ đẻ trong giờ học, học liệu do AI tạo sau giờ học.

- **Người dùng chính:** giáo viên tiếng Hàn (trung tâm, trường đại học, lớp online); du học sinh, lao động và cư dân nước ngoài từ sơ cấp đến TOPIK 6.
- **Vấn đề:** học sinh khó theo kịp bài giảng tiếng Hàn và không xem lại được; giáo viên mất nhiều thời gian soạn bài tập và theo dõi tiến độ.
- **Giá trị:** hiểu ngay trong lớp, ôn lại sau lớp, giáo viên tiết kiệm thời gian soạn bài.

Mã ưu tiên: **P0** = MVP, **P1** = ngay sau MVP, **P2** = sau đó.

---

## 1. Tài khoản & vai trò

| ID | Tính năng | Ưu tiên |
| --- | --- | --- |
| A1 | Đăng nhập Google (Supabase Auth) | P0 |
| A2 | Chọn vai trò sau lần đăng nhập đầu: Giáo viên / Học sinh | P0 |
| A3 | Học sinh chọn tiếng mẹ đẻ (đổi được bất cứ lúc nào) | P0 |
| A4 | Vai trò Quản lý trung tâm: lớp, giáo viên, báo cáo, gói dịch vụ | P2 |
| A5 | Giao diện đa ngôn ngữ (chuỗi UI theo ngôn ngữ người dùng) | P1 |

## 2. Lớp học (giáo viên)

| ID | Tính năng | Ưu tiên |
| --- | --- | --- |
| C1 | Tạo lớp: tên, cấp độ, lịch, giáo trình | P0 |
| C2 | Mã mời 6 ký tự + QR; học sinh vào lớp và chọn tiếng mẹ đẻ | P0 |
| C3 | Thẻ lớp hiển thị phân bố ngôn ngữ (VI 12 · ZH 8 · EN 3) | P0 |
| C4 | Chi tiết lớp: tab Học sinh, Buổi học, Từ vựng của lớp, Cài đặt | P0 |
| C5 | Cài đặt lớp: cho phép "Giữ để hỏi", tự xoá bản ghi sau N ngày, tự xuất Google Drive | P1 |

## 3. Tạo buổi học (3 bước)

| Bước | Nội dung | Ưu tiên |
| --- | --- | --- |
| 1. Lớp & hình thức | Lớp, tên buổi, giáo trình, nội dung chính; hình thức **Tại phòng / Online / Kết hợp** (chọn hình thức → tự chọn nguồn âm thanh) | P0 |
| 2. Âm thanh & phụ đề | Nguồn: Micro / Âm thanh tab / Cả hai; chọn thiết bị; ngôn ngữ phụ đề tự lấy từ danh sách lớp; chế độ hiển thị: Hàn + bản dịch / Chỉ tiếng Hàn / Ẩn bản dịch (luyện nghe) | P0 |
| 2. Nâng cao | Từ vựng bài học (tăng độ chính xác nhận dạng), tô màu ngữ pháp, phiên âm Latin, đọc bản dịch (TTS), ghi slide, chọn nội dung AI tạo sau buổi | P1 |
| 3. Kiểm tra | Thanh đo micro, trạng thái tab âm thanh, nói thử một câu (hiện bản dịch mẫu), ước tính phút AI, ghi chú đồng ý ghi âm | P0 |

Quy tắc: nút **Bắt đầu** bị khoá cho đến khi mọi nguồn đã chọn sẵn sàng. Lỗi cần xử lý: chưa cấp quyền micro, không có thiết bị, tab không chia sẻ âm thanh, hết hạn mức AI. App nhớ lựa chọn cuối cùng theo từng lớp.

## 4. Lớp trực tiếp (giáo viên)

| ID | Tính năng | Ưu tiên |
| --- | --- | --- |
| L1 | Thanh trên: REC + đồng hồ, số học sinh đang xem, tạm dừng, kết thúc | P0 |
| L2 | Thẻ câu: người nói, giờ, nhãn MIC/TAB, tiếng Hàn + bản dịch theo ngôn ngữ của lớp | P0 |
| L3 | Câu đang nghe (partial) hiện chữ nghiêng màu xám, chốt (final) thì thành chữ thường | P0 |
| L4 | Lọc bản dịch hiển thị: Tất cả / từng ngôn ngữ | P0 |
| L5 | Khung câu hỏi học sinh: bản tiếng Hàn + câu gốc, "Đã trả lời", "Ghim cho cả lớp" | P0 |
| L6 | Tín hiệu "Chưa hiểu": số học sinh bấm trong 2 phút qua | P1 |
| L7 | Tô màu mẫu ngữ pháp trong câu, chip giải thích | P1 |
| L8 | Chế độ chiếu TV (phụ đề chữ lớn, nền tối) | P1 |
| L9 | Trợ lý giảng dạy: gợi ý nhanh (từ vựng mới, ngữ pháp vừa dạy, tóm tắt, câu hỏi kiểm tra) + hỏi tự do | P1 |
| L10 | Câu hỏi nhanh (poll) đẩy xuống điện thoại học sinh, xem kết quả | P1 |
| L11 | Quản lý người nói: đổi tên, gộp, gán cho học sinh | P1 |
| L12 | Ghim câu làm ví dụ, lưu từ vào từ vựng bài | P1 |
| L13 | Mất mạng: tiếp tục ghi vào máy, tự tải lên khi có mạng | P1 |

Kết thúc: hộp xác nhận (cảnh báo câu hỏi chưa trả lời) → màn hình xử lý theo bước → Chi tiết buổi học.

## 5. Sau buổi học (giáo viên)

| ID | Tính năng | Ưu tiên |
| --- | --- | --- |
| D1 | Chi tiết buổi học: trình phát có dòng thời gian + ảnh slide; bấm câu để tua | P0 |
| D2 | Tab Bản ghi song ngữ · Từ vựng · Ngữ pháp · Tóm tắt · Câu hỏi học sinh | P0 |
| D3 | Giáo viên sửa và duyệt nội dung AI → "Duyệt và gửi cho lớp" | P0 |
| D4 | Sửa câu nhận sai trong bản ghi; từ đã sửa được thêm vào từ điển lớp | P1 |
| D5 | Bài tập: chọn nguồn, dạng bài (trắc nghiệm, điền ngữ pháp, nghe & chọn, sắp xếp câu, nói lại), số câu, hạn nộp → xem trước → giao | P1 |
| D6 | Xuất Google Drive, chia sẻ link | P1 |
| D7 | Tải bài giảng có sẵn (mp3, m4a, wav, mp4…, tối đa 5 giờ) hoặc link YouTube/Drive | P1 |

## 6. Thống kê (giáo viên)

- Chuyên cần và hoàn thành bài tập **theo nhóm ngôn ngữ** (P1)
- Lỗi hay gặp theo nhóm, nút tạo bài bổ trợ bằng tiếng mẹ đẻ của nhóm (P1)
- Học sinh cần hỗ trợ: chuyên cần thấp, quá hạn bài tập (P1)
- Báo cáo tháng PDF cho phụ huynh / trung tâm (P2)

## 7. Học sinh

| ID | Tính năng | Ưu tiên |
| --- | --- | --- |
| S1 | Trang chủ: thẻ "đang dạy" + nút vào lớp, ôn hôm nay, bài tập đến hạn, buổi học gần đây | P0 |
| S2 | Xem lớp trực tiếp trên điện thoại: phụ đề chữ lớn, câu cũ mờ dần | P0 |
| S3 | Chạm từ có gạch chân → nghĩa bằng tiếng mẹ đẻ, cấp TOPIK, phát âm, lưu vào Sổ từ | P0 |
| S4 | "Giữ để hỏi": nói bằng tiếng mẹ đẻ, giáo viên nhận tiếng Hàn | P1 |
| S5 | Nút "Chưa hiểu" | P1 |
| S6 | Xem lại buổi học, bấm câu để nghe đúng đoạn, hỏi trợ lý AI | P0 |
| S7 | Sổ từ: lọc theo lớp / bài / TOPIK, kèm ví dụ gốc trong bài | P1 |
| S8 | Ôn tập: flashcard lặp lại ngắt quãng, nghe chính tả | P1 |
| S9 | Làm bài tập, phản hồi và giải thích bằng tiếng mẹ đẻ | P1 |
| S10 | Luyện hội thoại với AI (tình huống, đóng vai, sửa câu, chấm phát âm) | P2 |
| S11 | Tiến độ: từ đã thuộc, giờ nghe, điểm theo tuần, cấp TOPIK ước tính | P1 |

Nếu lớp chưa bật tiếng mẹ đẻ của học sinh, hiển thị tiếng Anh thay thế kèm thông báo.

## 8. Yêu cầu phi chức năng

| Hạng mục | Yêu cầu |
| --- | --- |
| Độ trễ phụ đề | Partial < 1 giây, bản dịch final 1–2 giây sau khi câu kết thúc |
| Quy mô MVP | 1 lớp ≤ 40 học sinh, ≤ 5 ngôn ngữ đích cùng lúc |
| Thiết bị | Giáo viên: Chrome/Edge trên máy tính. Học sinh: trình duyệt điện thoại (iOS Safari, Android Chrome) |
| Truy cập | Hoạt động ở 390px, chế độ tối, tương phản đủ, phím tắt cho giáo viên |
| Bảo mật | Xem `PRIVACY.md` |
| Font | Noto Sans KR, Devanagari, Thai, Khmer, Myanmar cho mọi ngôn ngữ hỗ trợ |

## 9. Ngoài phạm vi MVP

App di động native, thanh toán, luyện thi TOPIK, đăng ký giọng nói (voice enrollment), tích hợp Google Classroom.
