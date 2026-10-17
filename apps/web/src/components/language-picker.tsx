import { selectableLanguages } from '@dasi/shared';
import { BetaTag, LangDot } from './ui';

/** Radio group of GA and Beta subtitle languages. Works without JavaScript. */
export function LanguagePicker({
  name,
  defaultValue,
  legend,
  hint,
}: {
  name: string;
  defaultValue?: string | null;
  legend: string;
  hint?: string;
}) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-xs font-semibold text-muted">{legend}</legend>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {selectableLanguages().map((lang) => (
          <label
            key={lang.code}
            lang={lang.code}
            className="flex cursor-pointer items-center gap-2 rounded-sm border border-line bg-surface px-3 py-2.5 has-checked:border-primary has-checked:shadow-[0_0_0_1px_var(--primary)] has-focus-visible:outline-2 has-focus-visible:outline-lang-en"
          >
            <input
              type="radio"
              name={name}
              value={lang.code}
              defaultChecked={defaultValue === lang.code}
              className="sr-only"
            />
            <LangDot code={lang.code} />
            <span className="font-mono text-xs text-muted uppercase">{lang.code}</span>
            <span className="font-medium">{lang.nativeName}</span>
            {lang.status === 'beta' && (
              <span className="ml-auto">
                <BetaTag />
              </span>
            )}
          </label>
        ))}
      </div>
      {hint && <p className="text-xs text-faint">{hint}</p>}
    </fieldset>
  );
}
