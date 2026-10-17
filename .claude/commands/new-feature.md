---
description: Plan, build and test one feature from docs/SPEC.md
argument-hint: <feature id or short description, e.g. "L5 student questions panel">
---

Build this feature: $ARGUMENTS

1. Read `CLAUDE.md`, then find the matching item in `docs/SPEC.md` and the screen in `docs/UI-UX.md` / `design/prototype-v2.html`.
2. Write a short plan before coding: files to create or change, DB migration + RLS (if any), API / WebSocket messages, i18n keys, tests. Wait for my OK if the plan changes the schema or adds a dependency.
3. Implement following the rules in `CLAUDE.md` (provider interfaces, no keys in client, strings in `packages/i18n`).
4. Add tests: unit tests for logic, a Playwright test for the main user path when there is UI.
5. Run `pnpm lint && pnpm typecheck && pnpm test` and fix failures.
6. Check UI at 390px and in dark mode, with loading / empty / error states.
7. Update docs if behaviour, schema or env vars changed, and tick the item in `docs/ROADMAP.md`.
8. Finish with a summary: what changed, how to test it manually, anything left open.
