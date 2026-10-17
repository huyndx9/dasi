import type { LanguageShare } from '@/lib/classes';

/** Stacked bar of students per mother tongue (SPEC C3). */
export function LanguageBar({ shares }: { shares: LanguageShare[] }) {
  return (
    <div className="flex h-2 gap-0.5 overflow-hidden rounded-full bg-sunk" aria-hidden>
      {shares.map((s) => (
        <i
          key={s.code}
          className="block h-full"
          style={{ width: `${s.share * 100}%`, background: `var(--l-${s.code}, var(--faint))` }}
        />
      ))}
    </div>
  );
}
