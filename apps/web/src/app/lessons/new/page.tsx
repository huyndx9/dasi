import Link from 'next/link';
import { AppShell } from '@/components/app-shell';
import { btn, Card, cx } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';
import { subtitleLanguages } from '@/lib/new-lesson';
import { NewLessonWizard, type WizardClass } from './new-lesson-wizard';

export default async function NewLessonPage({
  searchParams,
}: {
  searchParams: Promise<{ class?: string }>;
}) {
  const { class: classParam } = await searchParams;
  const { supabase, profile } = await requireSession('/lessons/new', 'teacher');
  const { data, error } = await supabase
    .from('classes')
    .select('id, name, textbook, class_members(mother_tongue)')
    .eq('teacher_id', profile.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const classes: WizardClass[] = data.map((c) => ({
    id: c.id,
    name: c.name,
    textbook: c.textbook,
    students: c.class_members.length,
    ...subtitleLanguages(c.class_members),
  }));

  return (
    <AppShell profile={profile}>
      <Card className="mx-auto flex max-w-[640px] flex-col shadow-card">
        {classes.length === 0 ? (
          <div className="flex flex-col items-start gap-4 p-6">
            <h1 className="text-2xl font-bold">{tr('newLesson.title')}</h1>
            <p className="text-muted">{tr('newLesson.noClasses')}</p>
            <Link href="/classes/new" className={cx(btn.base, btn.primary)}>
              + {tr('classes.new')}
            </Link>
          </div>
        ) : (
          <NewLessonWizard
            classes={classes}
            initialClassId={classes.some((c) => c.id === classParam) ? classParam! : classes[0]!.id}
          />
        )}
      </Card>
    </AppShell>
  );
}
