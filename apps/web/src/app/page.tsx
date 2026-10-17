import { selectableLanguages } from '@dasi/shared';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Logo } from '@/components/app-shell';
import { BetaTag, btn, Card, cx, LangDot } from '@/components/ui';
import { getSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';
import { homePathFor } from '@/lib/routes';

export default async function LandingPage() {
  const session = await getSession();
  if (session) redirect(homePathFor(session.profile.role));

  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-12 sm:py-20">
      <header className="flex flex-col gap-3">
        <div className="flex items-center gap-2.5">
          <Logo />
          <p className="font-ko text-sm font-medium text-muted">다시</p>
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight">{tr('app.name')}</h1>
        <p className="text-lg font-semibold text-muted">{tr('app.tagline')}</p>
        <p className="text-base">{tr('home.intro')}</p>
      </header>

      <section className="flex flex-col gap-2">
        <div>
          <Link href="/login" className={cx(btn.base, btn.primary, btn.lg)}>
            {tr('home.signIn')}
          </Link>
        </div>
        <p className="text-sm text-faint">{tr('home.signInHint')}</p>
      </section>

      <Card className="p-5 shadow-card">
        <h2 id="languages-title" className="mb-3 font-bold">
          {tr('home.languagesTitle')}
        </h2>
        <ul aria-labelledby="languages-title" className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {selectableLanguages().map((lang) => (
            <li
              key={lang.code}
              lang={lang.code}
              className="flex items-center gap-2 rounded-sm bg-sunk px-3 py-2"
            >
              <LangDot code={lang.code} />
              <span className="font-mono text-xs text-muted uppercase">{lang.code}</span>
              <span className="font-medium">{lang.nativeName}</span>
              {lang.status === 'beta' && (
                <span className="ml-auto">
                  <BetaTag />
                </span>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </main>
  );
}
