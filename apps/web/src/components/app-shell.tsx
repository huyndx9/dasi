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
        { href: '/join', label: tr('nav.join') },
      ];
  const initial = (profile.display_name.trim()[0] ?? '?').toUpperCase();

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex h-14 max-w-5xl items-center gap-3 px-4">
          <Link
            href={teacher ? '/classes' : '/home'}
            className="flex items-center gap-2.5 font-extrabold"
          >
            <Logo />
            <span>Dasi</span>
          </Link>
          <nav className="ml-2 flex min-w-0 gap-1 overflow-x-auto">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-sm px-2.5 py-1.5 text-sm font-medium text-muted hover:bg-sunk hover:text-fg"
              >
                {l.label}
              </Link>
            ))}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {demoLoginEnabled() && (
              <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-semibold text-warn">
                {tr('nav.demoBadge')}
              </span>
            )}
            <span className="hidden text-xs text-faint sm:inline">
              {teacher ? tr('nav.roleTeacher') : tr('nav.roleStudent')}
            </span>
            <span
              className="grid size-8 place-items-center rounded-full bg-live text-sm font-bold text-white"
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
