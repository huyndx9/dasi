import Link from 'next/link';
import { getLanguage, isLanguageCode } from '@dasi/shared';
import { tr } from '@/lib/i18n';

/** "Phụ đề hiện bằng Tiếng Việt · Đổi trong Cài đặt": the language is chosen once, changed in settings. */
export function MotherTongueLine({ code }: { code: string | null }) {
  const name = code && isLanguageCode(code) ? getLanguage(code).nativeName : null;
  return (
    <p className="text-sm text-muted">
      {name ? tr('student.languageLine', { language: name }) : tr('student.languageMissing')}{' '}
      <Link href="/settings" className="font-semibold text-fg underline underline-offset-2">
        {tr('student.changeLanguage')}
      </Link>
    </p>
  );
}
