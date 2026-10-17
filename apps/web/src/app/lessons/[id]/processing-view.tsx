import type { LessonStatus } from '@dasi/shared';
import { Alert, Card, cx } from '@/components/ui';
import { tr } from '@/lib/i18n';
import { processingSteps } from '@/lib/lessons';
import { AutoRefresh } from './auto-refresh';

/** "Đang hoàn tất buổi học" (prototype processingView): steps while lesson.finalize runs. */
export function ProcessingView({ status, error }: { status: LessonStatus; error: string | null }) {
  return (
    <Card className="mx-auto flex w-full max-w-[420px] flex-col gap-4 p-6">
      <AutoRefresh />
      <h2 className="text-lg font-bold">{tr('lessonDetail.processingTitle')}</h2>
      <ol className="flex flex-col gap-3">
        {processingSteps(status, error).map((step) => (
          <li key={step.key} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden
              className={cx(
                'grid size-[22px] shrink-0 place-items-center rounded-full text-xs',
                step.state === 'done' && 'bg-learn text-white',
                step.state === 'running' &&
                  'animate-spin border-2 border-live border-t-transparent motion-reduce:animate-none',
                step.state === 'failed' && 'bg-live text-white',
              )}
            >
              {step.state === 'done' ? '✓' : step.state === 'failed' ? '!' : ''}
            </span>
            <span>{tr(step.key)}</span>
            <span className="sr-only">{tr(`lessonDetail.state.${step.state}`)}</span>
          </li>
        ))}
      </ol>
      {error ? (
        <Alert tone="error">{tr('lessonDetail.processingFailed')}</Alert>
      ) : (
        <p className="text-xs text-faint">{tr('lessonDetail.processingHint')}</p>
      )}
    </Card>
  );
}
