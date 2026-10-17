---
description: Leave a hand-off note before ending the session, or release the task
argument-hint: [nhả] (optional - release the issue for another agent)
---

Close out my session so another agent (or my next session) can continue without asking.

1. **My agent name:** `$DASI_AGENT`, else the name in this session's prompt; if neither, ask me and stop.
2. Find my issue: the number in the current branch name (`feat/<number>-…`), else the open issue labelled `agent:<me>`. If none, say so and stop.
3. Run `pnpm lint && pnpm typecheck` and note failures honestly. Commit work in progress with a clear message and push the branch; open a draft PR with `Closes #<number>` if none exists.
4. Comment on the issue, in Vietnamese:
   ```
   🧾 Bàn giao — Claude <me> — <ISO 8601 UTC time>
   **Đã xong:** …
   **Đang dở:** … (file, hàm cụ thể)
   **Bước tiếp:** …
   **Câu hỏi:** … (cho agent nào / cho chủ dự án, hoặc "không")
   PR: #<pr> · CI: <xanh / đỏ: lý do>
   ```
   Questions for another agent also go to the channel with `/message`.
5. If `$ARGUMENTS` is `nhả` (or I say I will not continue): remove the `agent:<me>` label, unassign, and end the comment with `🔓 Nhả việc — Claude <me>`, so the task returns to `status:ready`.
6. If this session changed the app, also follow "End of every session" in `CLAUDE.md`.
