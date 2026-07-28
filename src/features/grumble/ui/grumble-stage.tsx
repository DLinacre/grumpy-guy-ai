import { memo } from 'react';
import type { Grumble } from '../../../shared/domain/grumble';

export type GrumbleStageProps = {
  current: Grumble | null;
  error: string | null;
  speechSupported: boolean;
  onSpeak: (text: string) => void;
  onToggleFavorite: (id: string) => void;
};

/** Formats a timestamp defensively — persisted data may carry an invalid date. */
function formatTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/** The face, the current quote, and its actions. */
export const GrumbleStage = memo(function GrumbleStage({
  current,
  error,
  speechSupported,
  onSpeak,
  onToggleFavorite,
}: GrumbleStageProps) {
  return (
    <section
      aria-live="polite"
      aria-label="Current grumble"
      className="flex items-center gap-[35px] border-y border-slate-line py-[42px] max-[650px]:gap-5 max-[650px]:py-[30px]"
    >
      <div
        aria-hidden="true"
        className="w-[135px] -rotate-[4deg] font-mono leading-[normal] text-[clamp(52px,8vw,92px)] font-bold tracking-[-12px] text-ember max-[650px]:w-[75px] max-[650px]:text-[49px]"
      >
        ಠ_ಠ
      </div>

      <div className="max-w-[700px] flex-1">
        {current ? (
          <>
            <p className="m-0 text-[clamp(25px,3.3vw,42px)] tracking-[-1.5px] max-[650px]:text-[27px]">
              “{current.text}”
            </p>
            <div className="mt-[18px] flex items-center gap-3 font-mono text-xs leading-[normal] text-ash-dim">
              <span className="mr-auto">
                {current.tone}
                {formatTime(current.createdAt) && ` · ${formatTime(current.createdAt)}`}
              </span>
              {speechSupported && (
                <button
                  type="button"
                  onClick={() => onSpeak(current.text)}
                  aria-label="Read aloud"
                  className="size-[33px] rounded-full border border-outline-soft bg-surface-alt text-bone"
                >
                  ◖
                </button>
              )}
              <button
                type="button"
                onClick={() => onToggleFavorite(current.id)}
                aria-label={current.favorite ? 'Remove favorite' : 'Favorite'}
                aria-pressed={current.favorite}
                className="size-[33px] rounded-full border border-outline-soft bg-surface-alt text-bone"
              >
                {current.favorite ? '★' : '☆'}
              </button>
            </div>
          </>
        ) : (
          <p className="m-0 text-[clamp(25px,3.3vw,42px)] tracking-[-1.5px] text-quote-dim max-[650px]:text-[27px]">
            No opinion yet. A rare moment of peace.
          </p>
        )}

        {error && (
          <p role="status" className="mt-4 font-mono text-sm text-ember-soft">
            {error}
          </p>
        )}
      </div>
    </section>
  );
});
