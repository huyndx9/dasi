import { redirect } from 'next/navigation';
import { signInAsGuest, signInWithGoogle } from '@/app/actions/auth';
import { Logo } from '@/components/app-shell';
import { Alert, btn, Card, cx } from '@/components/ui';
import { getSession } from '@/lib/auth';
import { demoLoginEnabled } from '@/lib/demo';
import { tr } from '@/lib/i18n';
import { homePathFor, safeNext } from '@/lib/routes';
import { getSupabaseEnv } from '@/lib/supabase/env';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const { next, error } = await searchParams;
  const session = await getSession();
  if (session) redirect(safeNext(next, homePathFor(session.profile.role)));
  const configured = getSupabaseEnv() !== null;
  const demo = configured && demoLoginEnabled();

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <Card className="flex w-full max-w-md flex-col gap-5 p-6 shadow-card sm:p-8">
        <div className="flex items-center gap-2.5 font-extrabold">
          <Logo />
          <span>Dasi</span>
        </div>
        <h1 className="text-2xl font-bold">{tr('login.title')}</h1>
        {error && (
          <Alert tone="error">{tr(error === 'guest' ? 'login.demoError' : 'login.error')}</Alert>
        )}
        {!configured && <Alert tone="error">{tr('login.notConfigured')}</Alert>}
        {demo && (
          <>
            <form action={signInAsGuest} className="flex flex-col gap-3 rounded bg-sunk p-4">
              <input type="hidden" name="next" value={safeNext(next)} />
              <h2 className="font-semibold">{tr('login.demoTitle')}</h2>
              <label className="flex flex-col gap-1.5 text-xs font-semibold text-muted">
                {tr('login.demoName')}
                <input
                  id="guest-name"
                  name="displayName"
                  maxLength={60}
                  autoComplete="nickname"
                  placeholder={tr('login.demoNamePlaceholder')}
                  className="h-11 rounded-sm border border-line bg-surface px-3 text-sm text-fg"
                />
              </label>
              <button type="submit" className={cx(btn.base, btn.primary, 'h-12 w-full')}>
                {tr('login.demoSubmit')}
              </button>
              <p className="text-xs text-muted">{tr('login.demoHint')}</p>
            </form>
            <p className="text-center text-xs text-faint">{tr('login.or')}</p>
          </>
        )}
        <form action={signInWithGoogle}>
          <input type="hidden" name="next" value={safeNext(next)} />
          <button
            type="submit"
            disabled={!configured}
            className={cx(btn.base, btn.secondary, 'h-12 w-full gap-2.5')}
          >
            <GoogleMark />
            {tr('login.google')}
          </button>
        </form>
        <p className="text-xs text-faint">{tr('login.consent')}</p>
      </Card>
    </main>
  );
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
