import { memo, useCallback } from 'react';
import { TONES, type Preferences, type Tone } from '../../../shared/domain/grumble';

export type SettingsPanelProps = {
  preferences: Preferences;
  onChange: (preferences: Preferences) => void;
  onClear: () => void;
};

const toneButtonBase =
  'rounded border px-3 py-2 capitalize transition-colors';

/**
 * Preference controls.
 *
 * Memoised because it re-renders only when preferences change, not on every
 * keystroke in the composer above it.
 */
export const SettingsPanel = memo(function SettingsPanel({
  preferences,
  onChange,
  onClear,
}: SettingsPanelProps) {
  const setTone = useCallback(
    (tone: Tone) => onChange({ ...preferences, tone }),
    [onChange, preferences],
  );

  return (
    <section aria-labelledby="settings-heading">
      <p className="mb-[13px] font-mono text-xs leading-[normal] tracking-[1.3px] text-ember-soft">CONTROL PANEL</p>
      <h2 id="settings-heading" className="mb-[18px] text-[25px] tracking-[-1px]">
        Calibrate the curmudgeon
      </h2>

      <div className="my-[15px] mb-[23px] flex gap-2" role="group" aria-label="Tone">
        {TONES.map((tone) => {
          const selected = preferences.tone === tone;
          return (
            <button
              key={tone}
              type="button"
              onClick={() => setTone(tone)}
              aria-pressed={selected}
              className={
                selected
                  ? `${toneButtonBase} border-ember bg-ember text-espresso-deep`
                  : `${toneButtonBase} border-outline bg-transparent text-control hover:border-ember-soft`
              }
            >
              {tone}
            </button>
          );
        })}
      </div>

      <label className="my-[13px] flex gap-[10px] text-toggle">
        <input
          type="checkbox"
          checked={preferences.autoplay}
          onChange={(event) => onChange({ ...preferences, autoplay: event.target.checked })}
          className="accent-ember"
        />
        <span>Read new grumbles aloud</span>
      </label>

      <label className="my-[13px] flex gap-[10px] text-toggle">
        <input
          type="checkbox"
          checked={preferences.reducedMotion}
          onChange={(event) => onChange({ ...preferences, reducedMotion: event.target.checked })}
          className="accent-ember"
        />
        <span>Reduce motion</span>
      </label>

      <button
        type="button"
        onClick={onClear}
        className="mt-[17px] border-0 bg-transparent p-2 pl-0 text-ember-soft underline underline-offset-4"
      >
        Clear local history
      </button>
    </section>
  );
});
