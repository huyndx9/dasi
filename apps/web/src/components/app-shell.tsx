import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOut } from '@/app/actions/auth';
import { demoLoginEnabled } from '@/lib/demo';
import type { Profile } from '@/lib/supabase/database.types';
import { tr } from '@/lib/i18n';
import { btn, cx } from './ui';

export function Logo() {
  return (
    <span className="grid size-8 place-items-center rounded-sm bg-primary font-ko text-base font-bold text-on-primary">
      다
    </span>
  );
}

export function AppShell({ profile, children }: { profile: Profile; children: ReactNode }) {
  const teacher = profile.role === 'teacher';
  const links = teacher
    ? [{ href: '/classes', label: tr('nav.classes') }]
    : [
        { href: '/home', label: tr('nav.home') },
        // Joining a class starts from the button on the home page; phones have no room for a third link.
        { href: '/settings', label: tr('nav.settings') },
      ];
  const initial = (profile.display_name.trim()[0] ?? '?').toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-2 px-4 sm:gap-3">
          <Link
            href={teacher ? '/classes' : '/home'}
            className="flex shrink-0 items-center gap-2.5 font-extrabold"
          >
            <Logo />
            <span className="hidden sm:inline">Dasi</span>
          </Link>
          <nav className="flex min-w-0 gap-1 overflow-x-auto sm:ml-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-sm px-2 py-1.5 text-sm font-medium whitespace-nowrap sm:px-2.5 text-muted hover:bg-sunk hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex shrink-0 items-center gap-2">
            {/* Phones have no room for the badge; the login page already says it is a test build. */}
            {demoLoginEnabled() && (
              <span className="hidden rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold whitespace-nowrap text-warn sm:inline-flex">
                {tr('nav.demoBadge')}
              </span>
            )}
            <span className="hidden text-xs text-faint sm:inline">
              {teacher ? tr('nav.roleTeacher') : tr('nav.roleStudent')}
            </span>
            <span
              className="hidden size-8 shrink-0 place-items-center rounded-full sm:grid bg-live text-sm font-bold text-white"
              title={profile.display_name}
            >
              {initial}
            </span>
            <form action={signOut}>
              <button type="submit" className={cx(btn.base, btn.secondary, 'h-8 px-3 text-xs')}>
                {tr('nav.signOut')}
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-24">{children}</main>
    </div>
  );
}
