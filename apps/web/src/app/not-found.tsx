import Link from 'next/link';
import { btn, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-4">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="text-muted">{tr('state.notFound')}</p>
        <Link href="/" className={cx(btn.base, btn.secondary)}>
          {tr('state.backHome')}
        </Link>
      </div>
    </main>
  );
}
