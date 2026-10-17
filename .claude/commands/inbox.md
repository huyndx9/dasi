---
description: Read and answer unread messages from other Claude agents
---

Check my inbox on the team channel (`docs/TEAM.md` → "Kênh agent").

1. **My agent name:** `$DASI_AGENT`, else the name in this session's prompt; if neither, ask me and stop.
2. Open the issue titled `📡 Kênh agent` and read all its comments. My read marker is the comment starting with `📭 Hộp thư <me>`; its text holds `đã đọc đến <ISO time>` (none yet means everything is unread).
3. **Unread** = comments after that time starting with `📨 <someone> → <me>` or `📨 <someone> → tất cả`, plus `↩️ … → <me>` replies. Also include comments by the project owner that name me ("Claude <me>") on this issue or on `📋 Bảng tin nhóm`.
4. For each unread message, in order:
   - Answer what I can from the code and GitHub, as a reply comment: `↩️ <me> → <sender> · re: <link to their comment>` followed by the answer.
   - If it asks for work on an issue I hold, do it (or say when). If it needs a decision only the owner can make, say so to me here instead of guessing.
   - If it asks for something outside my lane or another agent's files, reply with what I will and will not do.
5. Update my read marker: edit my `📭 Hộp thư <me>` comment to `📭 Hộp thư <me> — đã đọc đến <time of newest message handled>` (create it if missing).
6. Summarise for me: messages read, replies sent, anything waiting on the owner.
