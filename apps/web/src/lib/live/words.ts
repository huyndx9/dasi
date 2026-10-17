/** A piece of a subtitle line: plain text, or a known word the student can tap. */
export type LinePart = { text: string; word?: string };

/**
 * Splits a Korean line into plain text and known vocabulary (SPEC S3: underlined words).
 * Words match inside eojeol, so 할인을 underlines 할인. Longest words win and matches
 * never overlap. Grammar patterns (-고 싶다) are not single words and are skipped.
 */
export function markWords(text: string, words: readonly string[]): LinePart[] {
  const terms = [...new Set(words.map((w) => w.trim()))]
    .filter((w) => w.length > 0 && !w.startsWith('-') && !w.startsWith('~'))
    .sort((a, b) => b.length - a.length);
  if (terms.length === 0 || !text) return text ? [{ text }] : [];

  const parts: LinePart[] = [];
  let plain = '';
  let i = 0;
  outer: while (i < text.length) {
    for (const term of terms) {
      if (text.startsWith(term, i)) {
        if (plain) parts.push({ text: plain });
        plain = '';
        parts.push({ text: term, word: term });
        i += term.length;
        continue outer;
      }
    }
    plain += text[i];
    i++;
  }
  if (plain) parts.push({ text: plain });
  return parts;
}

/** The last `n` finals, oldest first (prototype: three lines, older ones fade). */
export function lastLines<T>(finals: readonly T[], n = 3): T[] {
  return finals.slice(Math.max(0, finals.length - n));
}
