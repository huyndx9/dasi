import { getLanguage, type LanguageCode } from '@dasi/shared';
import type { ReactNode } from 'react';
import { tr } from '@/lib/i18n';

// Visual vocabulary from design/prototype-v2.html (docs/UI-UX.md).

export const btn = {
  base: 'inline-flex h-10 items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap transition-colors disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lang-en',
  primary: 'bg-primary text-on-primary hover:opacity-90',
  secondary: 'border border-line bg-surface hover:bg-sunk',
  live: 'bg-live text-white hover:opacity-90',
  lg: 'h-12 px-5 text-base',
};

export function cx(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <section className={cx('rounded border border-line bg-surface', className)}>{children}</section>
  );
}

export function LangDot({ code }: { code: LanguageCode }) {
  return (
    <span
      aria-hidden
      className="inline-block size-2 shrink-0 rounded-full"
      style={{ background: `var(--l-${code}, var(--faint))` }}
    />
  );
}

export function BetaTag() {
  return (
    <span className="rounded-[5px] bg-warn-soft px-1.5 py-0.5 font-mono text-[10.5px] font-semibold text-warn">
      {tr('language.beta')}
    </span>
  );
}

/** "● VI 12 Beta" chip used on class cards and in the roster. */
export function LangChip({ code, count }: { code: LanguageCode; count?: number }) {
  const lang = getLanguage(code);
  return (
    <span className="inline-flex h-6 items-center gap-1.5 rounded-full bg-sunk px-2.5 text-xs font-medium whitespace-nowrap">
      <LangDot code={code} />
      {code.toUpperCase()}
      {count != null && <span className="text-muted">{count}</span>}
      {lang.status === 'beta' && <BetaTag />}
    </span>
  );
}

export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-semibold tracking-[.08em] text-faint uppercase">
      {children}
    </span>
  );
}

export function Alert({ tone, children }: { tone: 'error' | 'success'; children: ReactNode }) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cx(
        'rounded-sm px-3.5 py-3 text-sm font-medium',
        tone === 'error' ? 'bg-live-soft text-live' : 'bg-learn-soft text-learn',
      )}
    >
      {children}
    </p>
  );
}
