---
description: Pick and claim the next GitHub issue without overlapping other agents
argument-hint: [issue number] (optional)
---

Claim a task for me following `docs/TEAM.md`. Repository: the `origin` remote of this checkout.

1. **Who am I:** my agent name is `$DASI_AGENT` (run `echo $DASI_AGENT`), else the name in this session's prompt ("Bạn là Claude A"). If neither exists, ask me and stop. Agents may share one GitHub account, so identity comes from the agent name and `agent:*` labels, never from the GitHub login.
2. **Inbox first:** run the steps of `/inbox` quickly; an unanswered message may change what I should take.
3. **Team state:** list open issues (labels, assignees, body) and open pull requests (head branch, draft state, files changed).
   - "Held by others" = open issues labelled `agent:<X>` where X is not me.
   - Their paths = the `Thư mục chính:` line of those issues plus the files changed in PRs whose `Closes #n` points at them.
4. **Choose the issue.**
   - If `$ARGUMENTS` names an issue, use it, but stop and explain if it is closed, held by another agent, labelled `status:blocked` or `owner-action`, or has an open issue on its `Phụ thuộc:` line.
   - Otherwise pick from open issues labelled `status:ready` with no `agent:*` label, excluding `owner-action`. Skip any whose `Thư mục chính` overlaps paths held by others (same directory or parent/child), and skip `area:db` while another agent holds an `area:db` issue. Prefer my lane from the "Chia làn mặc định" table in `docs/TEAM.md`, then `P0` over `P1`, then the lowest number. If I already hold an issue, say so and ask whether to continue it instead.
   - If nothing qualifies, say why (blocked by which issues, or overlapping which agent's work) and stop.
5. **Claim it:** add the label `agent:<me>`, assign the issue to the GitHub account in use, and comment exactly: `🔒 Nhận việc — Claude <me> — <ISO 8601 UTC time> — nhánh <branch>`.
6. **Resolve races:** re-read the issue's labels and comments. If another agent's `🔒 Nhận việc` comment (without a later `🔓 Nhả việc` from that agent) is older than mine: remove `agent:<me>`, comment `🔓 Nhả việc — Claude <me> — nhận trùng, Claude <them> nhận trước`, and go back to step 4 once.
7. **Branch:** `git fetch origin main`, then create `<type>/<number>-<short-slug>` from `origin/main` (type: feat, fix, docs or chore). Push it with the first commit and open a draft PR with `Closes #<number>` right away, so other agents see the files I touch.
8. **Report:** the issue title and link, acceptance criteria, and which agent holds what nearby. Suggest `/new-feature #<number>` next.

Never take, relabel or edit an issue held by another agent; send them a message with `/message` instead.
