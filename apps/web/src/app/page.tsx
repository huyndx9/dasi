import { t } from '@dasi/i18n';
import { selectableLanguages } from '@dasi/shared';

const locale = 'vi';

export default function HomePage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col gap-8 px-4 py-12 sm:py-20">
      <header className="flex flex-col gap-3">
        <p className="font-ko text-sm font-medium text-muted">다시</p>
        <h1 className="text-4xl font-extrabold tracking-tight">{t(locale, 'app.name')}</h1>
        <p className="text-lg font-semibold text-muted">{t(locale, 'app.tagline')}</p>
        <p className="text-base">{t(locale, 'home.intro')}</p>
      </header>

      <section className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled
            className="h-11 rounded-full bg-primary px-5 font-semibold text-on-primary disabled:opacity-60"
          >
            {t(locale, 'home.teacherCta')}
          </button>
          <button
            type="button"
            disabled
            className="h-11 rounded-full border border-line bg-surface px-5 font-semibold disabled:opacity-60"
          >
            {t(locale, 'home.studentCta')}
          </button>
        </div>
        <p className="text-sm text-faint">{t(locale, 'home.comingSoon')}</p>
      </section>

      <section
        aria-labelledby="languages-title"
        className="rounded border border-line bg-surface p-5 shadow-card"
      >
        <h2 id="languages-title" className="mb-3 font-bold">
          {t(locale, 'home.languagesTitle')}
        </h2>
        <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {selectableLanguages().map((lang) => (
            <li
              key={lang.code}
              lang={lang.code}
              className="flex items-center gap-2 rounded-sm bg-sunk px-3 py-2"
            >
              <span
                aria-hidden
                className="size-2.5 shrink-0 rounded-full"
                style={{ background: `var(--l-${lang.code})` }}
              />
              <span className="font-mono text-xs text-muted uppercase">{lang.code}</span>
              <span className="font-medium">{lang.nativeName}</span>
              {lang.status === 'beta' && (
                <span className="ml-auto rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
                  {t(locale, 'language.beta')}
                </span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
