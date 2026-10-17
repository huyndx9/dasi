import { redirect } from 'next/navigation';
import { Card } from '@/components/ui';
import { getSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';
import { homePathFor, loginPath } from '@/lib/routes';
import { OnboardingForm } from './onboarding-form';

export default async function OnboardingPage() {
  const session = await getSession();
  if (!session) redirect(loginPath('/onboarding'));
  if (session.profile.role) redirect(homePathFor(session.profile.role));

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-8">
      <Card className="flex w-full max-w-lg flex-col gap-5 p-6 shadow-card sm:p-8">
        <h1 className="text-2xl font-bold">{tr('onboarding.title')}</h1>
        <OnboardingForm defaultLanguage={session.profile.mother_tongue} />
      </Card>
    </main>
  );
}
