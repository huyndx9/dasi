import { setMotherTongue } from '@/app/actions/classes';
import { AppShell } from '@/components/app-shell';
import { LanguagePicker } from '@/components/language-picker';
import { Alert, btn, Card, cx } from '@/components/ui';
import { requireSession } from '@/lib/auth';
import { tr } from '@/lib/i18n';

/** The one place a student changes the mother tongue chosen at first sign-in. */
export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string }>;
}) {
  const { saved } = await searchParams;
  const { profile } = await requireSession('/settings', 'student');

  return (
    <AppShell profile={profile}>
      <div className="mx-auto flex max-w-xl flex-col gap-4">
        <h1 className="text-2xl font-bold">{tr('settings.title')}</h1>
        {saved === 'language' && <Alert tone="success">{tr('settings.languageSaved')}</Alert>}
        <Card className="p-5">
          <form action={setMotherTongue} className="flex flex-col gap-3">
            <LanguagePicker
              name="motherTongue"
              defaultValue={profile.mother_tongue}
              legend={tr('settings.motherTongue')}
              hint={tr('settings.motherTongueHint')}
            />
            <div>
              <button type="submit" className={cx(btn.base, btn.primary)}>
                {tr('settings.save')}
              </button>
            </div>
          </form>
        </Card>
      </div>
    </AppShell>
  );
}
