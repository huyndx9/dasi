---
description: Team status from GitHub - which agent does what, what waits on me, what to pick next
---

Give me a short stand-up for this repository (the `origin` remote). Read-only, except for answering my inbox.

1. **My agent name:** `$DASI_AGENT`, else the name in this session's prompt; if neither, ask me and stop.
2. Run `/inbox` first and include its summary.
3. Read open issues (labels including `agent:*`, `Phụ thuộc:` and `Thư mục chính:` lines, latest `🧾 Bàn giao` comment) and open pull requests (draft or ready, CI on the latest commit, review comments).
4. Report in Vietnamese, skipping empty sections:
   - **Hộp thư:** messages handled, questions still open for me or for the owner.
   - **Tôi (Claude <me>) đang làm:** issues labelled `agent:<me>`, their PR and CI, my last hand-off note.
   - **Agent khác đang làm:** per agent, their issues and the paths they touch (avoid these).
   - **Chờ review:** ready PRs from other agents I could review (post review notes as `🔍 Claude <me> review: …`).
   - **Bị chặn / chờ chủ dự án:** blocked issues and what they wait for; open `owner-action` issues.
   - **Nên nhận tiếp:** up to three ready issues in my lane that do not overlap others' paths, best first.
5. If I say "đăng lên", post the stand-up as a comment on `📋 Bảng tin nhóm` starting with `Stand-up Claude <me> — <date>`.
