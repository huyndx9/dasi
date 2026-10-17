import { AppShell } from '@/components/app-shell';
import { Card } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';
import { NewClassForm } from './new-class-form';

export default async function NewClassPage() {
  const { profile } = await requireSession('/classes/new', 'teacher');
  return (
    <AppShell profile={profile}>
      <Card className="mx-auto flex max-w-xl flex-col gap-5 p-6 shadow-card">
        <h1 className="text-2xl font-bold">{tr('newClass.title')}</h1>
        <NewClassForm />
      </Card>
    </AppShell>
  );
}
