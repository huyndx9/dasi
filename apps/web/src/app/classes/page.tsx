import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { LanguageBar } from '@/components/language-bar';
import { btn, Card, cx, Eyebrow, LangChip } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { languageDistribution } from '@/lib/classes';
import { tr } from '@/lib/i18n';

export default async function ClassesPage() {
  const { supabase, profile } = await requireSession('/classes', 'teacher');
  const { data: classes, error } = await supabase
    .from('classes')
    .select('id, name, level, schedule, invite_code, class_members(mother_tongue)')
    .eq('teacher_id', profile.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  return (
    <AppShell profile={profile}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-bold">{tr('classes.title')}</h1>
        <Link href="/classes/new" className={cx(btn.base, btn.primary)}>
          + {tr('classes.new')}
        </Link>
      </header>

      {classes.length === 0 ? (
        <Card className="p-6 text-muted">{tr('classes.empty')}</Card>
      ) : (
        <ul className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {classes.map((c) => {
            const shares = languageDistribution(c.class_members);
            const total = c.class_members.length;
            return (
              <li key={c.id}>
                <Link
                  href={`/classes/${c.id}`}
                  className="flex h-full flex-col gap-3.5 rounded border border-line bg-surface p-[18px] transition-colors hover:border-faint"
                >
                  <div className="flex items-center justify-between gap-2">
                    {c.level ? (
                      <span className="rounded-full bg-sunk px-2.5 py-0.5 text-xs font-medium">
                        {c.level}
                      </span>
                    ) : (
                      <span />
                    )}
                    <span className="rounded-md bg-sunk px-2 py-0.5 font-mono text-xs">
                      <span className="sr-only">{tr('classes.inviteCode')} </span>
                      {c.invite_code}
                    </span>
                  </div>
                  <div>
                    <h2 className="text-[17px] font-bold">{c.name}</h2>
                    <span className="text-sm text-muted">
                      {[c.schedule, total ? tr('classes.studentCount', { n: total }) : null]
                        .filter(Boolean)
                        .join(' · ') || tr('classes.noStudents')}
                    </span>
                  </div>
                  {total > 0 ? (
                    <div className="flex flex-col gap-2">
                      <LanguageBar shares={shares} />
                      <div className="flex flex-wrap gap-1.5">
                        {shares.map((s) => (
                          <LangChip key={s.code} code={s.code} count={s.count} />
                        ))}
                      </div>
                    </div>
                  ) : (
                    <Eyebrow>{tr('classes.noStudents')}</Eyebrow>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </AppShell>
  );
}
