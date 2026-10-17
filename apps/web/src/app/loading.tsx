import { tr } from '@/lib/i18n';

export default function Loading() {
  return (
    <div className="grid min-h-dvh place-items-center text-sm text-muted" role="status">
      {tr('state.loading')}
    </div>
  );
}
