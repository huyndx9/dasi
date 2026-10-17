# CLAUDE.md

Guidance for Claude Code when working in this repository. Read this first, then the doc relevant to the task.

## What this project is

Dasi (다시) is an AI assistant for **multilingual Korean-language classes**. A teacher speaks Korean; each student sees live subtitles in their own mother tongue. After class, AI produces a bilingual transcript, vocabulary, grammar notes and exercises that the teacher reviews before sending to the class.

Core idea that shapes the architecture: **recognise Korean speech once, translate in parallel only into the languages present in the class.** Cost scales with the number of target languages, not the number of students.

- Product spec: `docs/SPEC.md`
- Architecture, data model, realtime pipeline: `docs/ARCHITECTURE.md`
- Languages, rollout waves, QA process: `docs/LANGUAGES.md`
- Roadmap and current phase: `docs/ROADMAP.md`
- UI/UX rules and design tokens: `docs/UI-UX.md` (reference prototype: `design/prototype-v2.html`)
- Privacy and consent rules: `docs/PRIVACY.md`

## Stack

- pnpm workspaces + Turborepo, TypeScript 6 strict everywhere; one root ESLint flat config; workspace packages ship TS source (Next transpiles them, tsup bundles them for realtime/worker)
- `apps/web`: Next.js App Router, Tailwind, shadcn/ui, Supabase client
- `apps/realtime`: Node + Fastify + `ws`; long-lived WebSocket per audio source; streams to the STT provider and fans out subtitles to the room
- `apps/worker`: BullMQ jobs (post-class processing)
- `packages/providers`: `SttProvider`, `LlmProvider`, `TtsProvider` interfaces + adapters (only `mock` so far; Soniox, Anthropic, … to come)
- `packages/shared`: domain types, zod schemas, language registry
- `packages/i18n`: UI strings (source language: Vietnamese `vi`)
- `supabase/`: SQL migrations, RLS policies, seed data

## Commands

```bash
pnpm install
pnpm dev               # all apps
pnpm --filter web dev  # one app
pnpm lint && pnpm typecheck
pnpm test              # Vitest
pnpm test:e2e          # Playwright
DATABASE_URL=... pnpm test:db  # migrations + seed + RLS checks on an empty Postgres
pnpm format            # Prettier (Markdown is not reformatted)
pnpm db:migrate        # apply supabase/migrations
pnpm db:seed
```

## Rules

1. **Never put API keys in client code.** All STT/LLM calls go through `apps/realtime`, `apps/worker` or Next.js server code. Browser only sends audio and receives results.
2. **Every request is authenticated.** Verify the Supabase JWT in API routes and on WebSocket connect. Students can only read data for classes they belong to (enforce with RLS, not only in code).
3. **Use the provider interfaces.** Never import a vendor SDK outside `packages/providers`. Adding a vendor = new adapter + config, no app changes.
4. **No hard-coded UI strings.** Put them in `packages/i18n`. Korean learning content (example sentences, grammar patterns) is data, not i18n strings.
5. **Language codes** are ISO 639-1 (`vi`, `zh`, `en`, `uz`, `ru`, `ne`, `mn`, `th`, …) and must exist in `packages/shared/src/languages.ts`. A language in `beta` status must show the Beta tag in the UI.
6. **Realtime results have two states:** `partial` (may change, render grey italic) and `final` (persist to DB, then translate). Only persist and translate `final` segments.
7. **Recording requires consent.** Do not start capture without the consent step in the new-session flow. See `docs/PRIVACY.md`.
8. **Database changes** only via a new file in `supabase/migrations/` with matching RLS policies and checks in `supabase/tests/rls.sql`. Never edit an applied migration. Cross-table policy conditions go through `SECURITY DEFINER` helpers to avoid RLS recursion.
9. Keep components small; colocate tests (`*.test.ts`). Prefer server components; mark client components explicitly.
10. Do not commit `.env*` files (except `.env.example`), recordings, or real student data.

## Domain glossary

| Term | Meaning |
| --- | --- |
| Class (`class`) | A teaching group with an invite code and a roster |
| Lesson (`lesson`) | One recorded teaching session of a class |
| Segment (`segment`) | One recognised utterance: speaker, source (MIC/TAB), Korean text, translations, timestamps |
| Source | Audio input: `mic` (teacher microphone) or `tab` (shared tab audio, e.g. Zoom) |
| Mother tongue | The student's chosen language for subtitles and explanations |
| Hold-to-ask | Student records a question in their language; teacher receives Korean |
| Confused signal | Student taps "Chưa hiểu"; teacher sees a count for the last 2 minutes |
| Wave | Language rollout batch (1 = GA, 2 = Beta, 3 = planned) |

## Definition of done

- Types, lint and tests pass (`pnpm lint && pnpm typecheck && pnpm test`)
- New UI works at 390px width and in dark mode, with loading / empty / error states
- New strings added to `packages/i18n` (at least `vi`, `en`)
- Docs updated if behaviour, schema or env vars changed
- No secrets, no real personal data in commits

## Working style

- For anything larger than a small fix, write a short plan first (files to touch, schema changes, tests), then implement.
- Match the visual language of `design/prototype-v2.html` (tokens listed in `docs/UI-UX.md`).
- When a requirement is ambiguous, check `docs/SPEC.md`; if still unclear, ask instead of guessing.
- UI copy is Vietnamese by default, plain and specific ("Bắt đầu buổi học", "Đã gửi câu hỏi").
