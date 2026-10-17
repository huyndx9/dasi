# Ngôn ngữ hỗ trợ

Dasi ưu tiên ngôn ngữ của các nhóm du học sinh và cư dân nước ngoài đông nhất tại Hàn Quốc.

| Đợt | Mã | Ngôn ngữ | Du học sinh (1/4/2026) | Cư dân (10/2025) | Trạng thái | Font |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `vi` | Tiếng Việt | 96.834 | ~354.000 | GA | Be Vietnam Pro |
| 1 | `zh` | 中文简体 | 78.890 | ~975.000 (gồm người gốc Hàn) | GA | hệ thống |
| 1 | `en` | English | — | ~196.000 (Mỹ) | GA | — |
| 2 | `uz` | Oʻzbekcha | 20.876 | ~102.000 | Beta | — |
| 2 | `ru` | Русский | — | ngôn ngữ chung Trung Á | Beta | — |
| 2 | `ne` | नेपाली | 20.118 | — | Beta | Noto Sans Devanagari |
| 2 | `mn` | Монгол | 17.189 | — | Beta | — (chữ Kirin) |
| 2 | `th` | ไทย | — | ~170.000 | Beta | Noto Sans Thai |
| 3 | `id` `tl` `km` `my` `ja` | Indonesia, Tagalog, ខ្មែរ, မြန်မာ, 日本語 | — | — | Dự kiến | Noto Sans Khmer, Noto Sans Myanmar |

Nguồn: số du học sinh theo [Herald Kyungje (25/8/2026)](https://www.heraldk.com/article/2026082520002400675); số cư dân theo [Seoulstart, 2026](https://seoulstart.com/ko/reports/state-of-foreign-residents-2026), trích số liệu Bộ Tư pháp. Cần cập nhật khi có số liệu mới.

## Trạng thái

- **GA:** đã qua kiểm tra chất lượng, hiển thị bình thường.
- **Beta:** dùng được, UI luôn gắn nhãn Beta, có nút "Báo dịch sai".
- **Dự kiến:** chưa bật; chỉ hiện trong danh sách lộ trình.

## Quy trình thêm một ngôn ngữ

Dùng lệnh Claude Code `/add-language <mã>` hoặc làm theo checklist:

- [ ] Thêm vào `packages/shared/src/languages.ts` (mã, tên bản ngữ, tên tiếng Việt, hướng chữ, font, `status: 'beta'`)
- [ ] Kiểm tra STT provider có nhận dạng ngôn ngữ đó không (dùng cho "Giữ để hỏi")
- [ ] Thêm font vào layout nếu cần (Google Fonts, có fallback)
- [ ] Thêm chuỗi UI tối thiểu vào `packages/i18n/<mã>.json` (có thể để Beta dùng tiếng Anh dự phòng)
- [ ] Bộ 50 câu mẫu lớp học (KO → ngôn ngữ mới) trong `supabase/seed/translation-samples/<mã>.json`
- [ ] Người bản xứ chấm bộ câu mẫu: ≥ 90% câu "dùng được" mới lên GA
- [ ] Kiểm tra hiển thị ở 390px, chế độ tối, tra từ (đặc biệt chữ không có khoảng trắng như ไทย, ខ្មែរ, မြန်မာ cần tách từ)
- [ ] Cập nhật bảng trên và `README.md`
