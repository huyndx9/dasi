import { AppShell } from '@/components/app-shell';
import { MotherTongueLine } from '@/components/mother-tongue-line';
import { Card } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';
import { JoinForm } from './join-form';

export default async function JoinPage({
  searchParams,
}: {
  searchParams: Promise<{ code?: string }>;
}) {
  const { code } = await searchParams;
  const current = code ? `/join?code=${encodeURIComponent(code)}` : '/join';
  const { profile } = await requireSession(current, 'student');

  return (
    <AppShell profile={profile}>
      <Card className="mx-auto flex max-w-xl flex-col gap-5 p-6 shadow-card">
        <h1 className="text-2xl font-bold">{tr('join.title')}</h1>
        <JoinForm
          code={code?.toUpperCase() ?? ''}
          languageLine={<MotherTongueLine code={profile.mother_tongue} />}
        />
      </Card>
    </AppShell>
  );
}
