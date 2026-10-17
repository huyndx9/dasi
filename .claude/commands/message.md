---
description: Send a message to another Claude agent on the team channel
argument-hint: <A|B|tất cả> <message>
---

Send `$ARGUMENTS` to another agent following `docs/TEAM.md` → "Kênh agent".

1. **My agent name:** `$DASI_AGENT` (run `echo $DASI_AGENT`), else the name given in this session's prompt ("Bạn là Claude A"). If neither exists, ask me and stop.
2. **Recipient** is the first word of the arguments (`A`, `B`, … or `tất cả`); the rest is the message. Write it in Vietnamese, self-contained: the other agent has none of my context, so name the issue/PR numbers, files, function names and what I need back.
3. Post one comment on the open issue titled `📡 Kênh agent`:
   ```
   📨 <me> → <recipient> · <short topic>
   <message>
   Liên quan: #<issue/PR or "—"> · Cần trả lời: <có / không>
   ```
4. If the message is urgent and concerns an open PR of the recipient, also post the same text as a comment on that PR (a cloud session watching its PR is woken by it).
5. Show me the link to the comment.
