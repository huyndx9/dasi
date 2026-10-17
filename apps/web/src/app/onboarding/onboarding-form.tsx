'use client';

import { useActionState } from 'react';
import { completeOnboarding } from '@/app/actions/auth';
import { LanguagePicker } from '@/components/language-picker';
import { Alert, btn, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';

const roles = [
  { value: 'teacher', title: 'onboarding.teacher', desc: 'onboarding.teacherDesc' },
  { value: 'student', title: 'onboarding.student', desc: 'onboarding.studentDesc' },
] as const;

export function OnboardingForm({ defaultLanguage }: { defaultLanguage: string | null }) {
  const [state, action, pending] = useActionState(completeOnboarding, {});

  return (
    <form action={action} className="group flex flex-col gap-5">
      <fieldset className="flex flex-col gap-3">
        <legend className="sr-only">{tr('onboarding.title')}</legend>
        {roles.map((r) => (
          <label
            key={r.value}
            className="flex cursor-pointer items-start gap-3.5 rounded border border-line bg-surface p-4 has-checked:border-primary has-checked:shadow-[0_0_0_1px_var(--primary)] has-focus-visible:outline-2 has-focus-visible:outline-lang-en"
          >
            <input
              type="radio"
              name="role"
              value={r.value}
              className="mt-1 accent-[var(--primary)]"
            />
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold">{tr(r.title)}</span>
              <span className="text-sm text-muted">{tr(r.desc)}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {/* Shown only once "Học sinh" is selected (SPEC A3). */}
      <div className="hidden group-has-[input[value=student]:checked]:block">
        <LanguagePicker
          name="motherTongue"
          defaultValue={defaultLanguage}
          legend={tr('onboarding.motherTongue')}
          hint={tr('onboarding.motherTongueHint')}
        />
      </div>

      {state.error && <Alert tone="error">{state.error}</Alert>}
      <button type="submit" disabled={pending} className={cx(btn.base, btn.primary, btn.lg)}>
        {tr('onboarding.continue')}
      </button>
    </form>
  );
}
