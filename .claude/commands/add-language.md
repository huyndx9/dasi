---
description: Add a new subtitle language (starts in Beta)
argument-hint: <ISO 639-1 code, e.g. "km">
---

Add subtitle language `$ARGUMENTS`, following the checklist in `docs/LANGUAGES.md`:

1. Add it to `packages/shared/src/languages.ts` with `status: 'beta'`, native name, Vietnamese name, script direction and font.
2. Check whether the configured STT provider recognises this language (needed for hold-to-ask). Report the result; do not guess.
3. Load the font in `apps/web` layout if the script needs one (Google Fonts with a fallback stack).
4. Create `packages/i18n/$ARGUMENTS.json` with the minimum keys, falling back to English for missing strings.
5. Create `supabase/seed/translation-samples/$ARGUMENTS.json` with 50 classroom sentences (Korean source + machine translation) for native-speaker review. Mark them `reviewed: false`.
6. Verify rendering at 390px and dark mode, and word lookup for scripts without spaces.
7. Update the table in `docs/LANGUAGES.md` and the language section of `README.md`.
8. Summarise what still needs a human: native review, provider support gaps.
