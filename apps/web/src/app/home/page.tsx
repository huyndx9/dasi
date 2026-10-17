import Link from 'next/link';
import { setMotherTongue } from '@/app/actions/classes';
import { AppShell } from '@/components/app-shell';
import { LanguagePicker } from '@/components/language-picker';
import { Alert, btn, Card, cx } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';

export default async function StudentHomePage({
  searchParams,
}: {
  searchParams: Promise<{ joined?: string; saved?: string }>;
}) {
  const { joined, saved } = await searchParams;
  const { supabase, profile } = await requireSession('/home', 'student');
  const { data: memberships, error } = await supabase
    .from('class_members')
    .select('class_id, classes(id, name, level, schedule, profiles(display_name))')
    .eq('student_id', profile.id)
    .order('joined_at', { ascending: false });
  if (error) throw new Error(error.message);

  const classes = memberships.flatMap((m) => (m.classes ? [m.classes] : []));
  const joinedClass = joined ? classes.find((c) => c.id === joined) : undefined;

  return (
    <AppShell profile={profile}>
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-2xl font-bold">{tr('studentHome.title')}</h1>
        {joinedClass && (
          <Alert tone="success">{tr('studentHome.joined', { name: joinedClass.name })}</Alert>
        )}
        {saved === 'language' && <Alert tone="success">{tr('studentHome.languageSaved')}</Alert>}

        <Card className="flex flex-col gap-3 p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold">{tr('studentHome.classes')}</h2>
            <Link href="/join" className={cx(btn.base, btn.secondary, 'h-8 px-3 text-xs')}>
              + {tr('studentHome.join')}
            </Link>
          </div>
          {classes.length === 0 ? (
            <p className="text-muted">{tr('studentHome.empty')}</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {classes.map((c) => (
                <li key={c.id} className="flex flex-col gap-0.5 rounded-sm bg-sunk px-3.5 py-3">
                  <span className="font-semibold">{c.name}</span>
                  <span className="text-xs text-muted">
                    {[
                      c.profiles?.display_name
                        ? tr('studentHome.teacher', { name: c.profiles.display_name })
                        : null,
                      c.level,
                      c.schedule,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <form action={setMotherTongue} className="flex flex-col gap-3">
            <LanguagePicker
              name="motherTongue"
              defaultValue={profile.mother_tongue}
              legend={tr('studentHome.motherTongue')}
              hint={tr('studentHome.motherTongueHint')}
            />
            <div>
              <button type="submit" className={cx(btn.base, btn.primary)}>
                {tr('studentHome.save')}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
