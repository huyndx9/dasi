import { getLanguage, isLanguageCode, type LanguageCode } from '@dasi/shared';

export interface LanguageShare {
  code: LanguageCode;
  count: number;
  /** 0–1 */
  share: number;
}

/** Students per mother tongue, largest group first (SPEC C3: "VI 12 · ZH 8 · EN 3"). */
export function languageDistribution(members: { mother_tongue: string }[]): LanguageShare[] {
  const counts = new Map<LanguageCode, number>();
  for (const m of members) {
    if (isLanguageCode(m.mother_tongue)) {
      counts.set(m.mother_tongue, (counts.get(m.mother_tongue) ?? 0) + 1);
    }
  }
  const total = [...counts.values()].reduce((a, b) => a + b, 0);
  return [...counts.entries()]
    .map(([code, count]) => ({ code, count, share: total ? count / total : 0 }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export function isBeta(code: LanguageCode): boolean {
  return getLanguage(code).status === 'beta';
}
