---
description: Check the current changes before opening a pull request
---

Review the uncommitted and branch changes (`git diff main...HEAD` plus working tree) against `CLAUDE.md`:

1. Run `pnpm lint && pnpm typecheck && pnpm test`; report failures.
2. Look for: API keys or secrets, vendor SDK imports outside `packages/providers`, hard-coded UI strings, DB changes without a migration + RLS, edited old migrations, real personal data.
3. Check that realtime code only persists and translates `final` segments.
4. Check UI changes for 390px layout, dark mode tokens, and loading / empty / error states.
5. List docs that should be updated (`SPEC`, `ARCHITECTURE`, `.env.example`, `ROADMAP`).
6. Draft a PR description using `.github/pull_request_template.md` and a Conventional Commit title.

Report findings ranked by severity. Do not commit or push.
