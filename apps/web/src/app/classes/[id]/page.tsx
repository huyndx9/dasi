import { getLanguage, isLanguageCode } from '@dasi/shared';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { headers } from 'next/headers';
import QRCode from 'qrcode';
import { AppShell } from '@/components/app-shell';
import { LanguageBar } from '@/components/language-bar';
import { btn, Card, cx, Eyebrow, LangChip, LangDot } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { languageDistribution } from '@/lib/classes';
import { locale, tr } from '@/lib/i18n';
import { joinUrl } from '@/lib/routes';
import { CopyButton } from './copy-button';
import { LessonsTab } from './lessons-tab';

const tabs = [
  { key: 'students', label: 'classDetail.tabStudents' },
  { key: 'lessons', label: 'classDetail.tabLessons' },
] as const;

export default async function ClassDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab: tabParam } = await searchParams;
  const tab = tabParam === 'lessons' ? 'lessons' : 'students';
  const { supabase, profile } = await requireSession(`/classes/${id}`, 'teacher');

  const { data: cls } = await supabase
    .from('classes')
    .select(
      'id, name, level, schedule, textbook, invite_code, class_members(student_id, mother_tongue, joined_at, profiles(display_name))',
    )
    .eq('id', id)
    .maybeSingle();
  if (!cls) notFound();

  const lessons =
    tab === 'lessons'
      ? await supabase
          .from('lessons')
          .select('id, title, topic, status, started_at, ended_at, target_langs')
          .eq('class_id', cls.id)
          .order('started_at', { ascending: false })
      : null;

  const h = await headers();
  const origin = `${h.get('x-forwarded-proto') ?? 'http'}://${h.get('x-forwarded-host') ?? h.get('host')}`;
  const qr = await QRCode.toString(joinUrl(origin, cls.invite_code), {
    type: 'svg',
    margin: 1,
    color: { dark: '#16223B', light: '#FFFFFF' },
  });
  const shares = languageDistribution(cls.class_members);
  const members = [...cls.class_members].sort((a, b) => a.joined_at.localeCompare(b.joined_at));
  const dateFormat = new Intl.DateTimeFormat(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return (
    <AppShell profile={profile}>
      <Link href="/classes" className="mb-2 inline-block text-sm text-muted hover:text-fg">
        ← {tr('classDetail.back')}
      </Link>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold">{cls.name}</h1>
          <p className="text-sm text-muted">
            {[cls.level, cls.schedule, cls.textbook].filter(Boolean).join(' · ')}
          </p>
        </div>
        <Link href={`/lessons/new?class=${cls.id}`} className={cx(btn.base, btn.live)}>
          + {tr('classDetail.newLesson')}
        </Link>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <Card className="min-w-0">
          <nav
            className="flex gap-1 overflow-x-auto border-b border-line px-4"
            aria-label={cls.name}
          >
            {tabs.map((t) => (
              <Link
                key={t.key}
                href={`/classes/${cls.id}${t.key === 'students' ? '' : `?tab=${t.key}`}`}
                aria-current={tab === t.key ? 'page' : undefined}
                className={cx(
                  '-mb-px h-10 border-b-2 px-3 pt-2.5 text-sm font-semibold whitespace-nowrap',
                  tab === t.key ? 'border-live text-fg' : 'border-transparent text-muted',
                )}
              >
                {tr(t.label)}
                {t.key === 'students' && members.length > 0 && ` (${members.length})`}
              </Link>
            ))}
          </nav>
          <div className="p-4">
            {tab === 'lessons' ? (
              <LessonsTab lessons={lessons?.data ?? []} failed={!!lessons?.error} />
            ) : members.length === 0 ? (
              <p className="text-muted">
                {tr('classDetail.noStudents', { code: cls.invite_code })}
              </p>
            ) : (
              <div className="flex flex-col gap-4">
                <div className="flex flex-col gap-2">
                  <LanguageBar shares={shares} />
                  <div className="flex flex-wrap gap-1.5">
                    {shares.map((s) => (
                      <LangChip key={s.code} code={s.code} count={s.count} />
                    ))}
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-sm">
                    <thead>
                      <tr className="text-left text-[11px] tracking-[.06em] text-faint uppercase">
                        <th className="border-b border-line px-3 py-2.5 font-semibold">
                          {tr('classDetail.colStudent')}
                        </th>
                        <th className="border-b border-line px-3 py-2.5 font-semibold">
                          {tr('classDetail.colLanguage')}
                        </th>
                        <th className="border-b border-line px-3 py-2.5 text-right font-semibold">
                          {tr('classDetail.colJoined')}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {members.map((m) => (
                        <tr key={m.student_id} className="border-b border-line last:border-0">
                          <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                            {m.profiles?.display_name || tr('classDetail.unnamed')}
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            {isLanguageCode(m.mother_tongue) ? (
                              <span
                                className="inline-flex items-center gap-1.5"
                                lang={m.mother_tongue}
                              >
                                <LangDot code={m.mother_tongue} />
                                {getLanguage(m.mother_tongue).nativeName}
                              </span>
                            ) : (
                              m.mother_tongue
                            )}
                          </td>
                          <td className="px-3 py-2.5 text-right font-mono text-xs whitespace-nowrap text-muted tabular-nums">
                            {dateFormat.format(new Date(m.joined_at))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </Card>

        <Card className="flex flex-col items-center gap-3 p-5 text-center">
          <Eyebrow>{tr('classDetail.invite')}</Eyebrow>
          <div
            role="img"
            aria-label={tr('classDetail.qrLabel', { name: cls.name })}
            className="w-40 rounded-sm bg-white p-1.5 [&>svg]:h-auto [&>svg]:w-full"
            dangerouslySetInnerHTML={{ __html: qr }}
          />
          <span className="rounded-md bg-sunk px-3.5 py-1.5 font-mono text-[22px] tracking-[.15em]">
            {cls.invite_code}
          </span>
          <CopyButton value={cls.invite_code} />
          <p className="text-xs text-muted">{tr('classDetail.inviteHint')}</p>
        </Card>
      </div>
    </AppShell>
  );
}
