'use client';

import { useActionState } from 'react';
import { publishLesson } from '@/app/actions/lessons';
import { Alert, btn, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';

/** "Duyệt và gửi cho lớp": students see the lesson and its material from then on. */
export function PublishButton({ lessonId }: { lessonId: string }) {
  const [state, action, pending] = useActionState(publishLesson, {});
  return (
    <form action={action} className="flex w-full flex-col gap-2 sm:w-auto sm:items-end">
      <input type="hidden" name="lessonId" value={lessonId} />
      <button
        type="submit"
        disabled={pending}
        className={cx(btn.base, btn.primary, 'w-full sm:w-auto')}
      >
        ✓ {tr(pending ? 'lessonDetail.publishing' : 'lessonDetail.publish')}
      </button>
      <p className="text-xs text-faint sm:max-w-xs sm:text-right">
        {tr('lessonDetail.publishHint')}
      </p>
      {state.error && <Alert tone="error">{state.error}</Alert>}
    </form>
  );
}
