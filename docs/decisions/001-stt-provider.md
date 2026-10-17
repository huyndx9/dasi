# 001 · Nhà cung cấp STT

**Trạng thái:** đang thử · cập nhật 17/10/2026

## Bối cảnh

Lớp trực tiếp cần nhận dạng tiếng Hàn theo luồng: `partial` < 600 ms, `final` đủ nhanh để dịch xong trong 1,2 s (`docs/ARCHITECTURE.md` → "Độ trễ mục tiêu"). Ngày 17/10/2026 dự án chọn OpenAI cho LLM; adapter STT đầu tiên cũng dùng OpenAI (#6) để chỉ cần một khoá API trong giai đoạn MVP. Spike so sánh Soniox / Return Zero / CLOVA / Deepgram (`docs/ROADMAP.md`, Giai đoạn 0) vẫn mở.

## Adapter OpenAI (`packages/providers/src/adapters/openai-stt.ts`)

- Realtime API, WebSocket `intent=transcription`, cấu hình bằng `session.update` (`type: transcription`).
- Audio vào: PCM16 mono 16 kHz từ trình duyệt → adapter nội suy tuyến tính lên 24 kHz (OpenAI chỉ nhận `audio/pcm` 24 kHz) → `input_audio_buffer.append` (base64).
- Server VAD (`silence_duration_ms: 500`, `prefix_padding_ms: 300`) tách câu. `…transcription.delta` → `partial`; `…transcription.completed` → `final`, phát theo thứ tự nói (thứ tự `input_audio_buffer.committed`). Thời điểm `startMs` / `endMs` lấy từ `speech_started` / `speech_stopped`.
- Một ngôn ngữ trong `languages` → gửi `language`; nhiều ngôn ngữ → để model tự nhận diện. Từ vựng bài học (`context`, tối đa 100 từ) → `prompt`.
- Không tách người nói: `speaker` luôn trống.
- `end()`: nếu đang có người nói thì `input_audio_buffer.commit`, chờ bản ghi cuối (tối đa 5 s) rồi đóng.
- Cấu hình: `STT_PROVIDER=openai`, `OPENAI_API_KEY`, `STT_MODEL` (ví dụ `gpt-4o-transcribe`).

## Độ trễ đo được

Chưa đo: phiên phát triển chưa có khoá OpenAI. Khi có khoá, đo trên 3 đoạn ghi âm lớp thật và điền bảng:

| Model | Đoạn | Partial đầu tiên sau khi bắt đầu nói | Final sau khi ngừng nói | Ghi chú lỗi nhận dạng |
| --- | --- | --- | --- | --- |
| | | | | |

## Còn mở

- Kết quả spike với các nhà cung cấp khác, rồi chốt nhà cung cấp mặc định.
- Có cần tách người nói không. Adapter hiện tại không tách; model `gpt-4o-transcribe-diarize` chưa được thử.
