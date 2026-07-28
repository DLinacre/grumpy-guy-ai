import { memo } from 'react';
import type { Grumble } from '../../../shared/domain/grumble';

export type GrumbleHistoryProps = {
  history: readonly Grumble[];
  onSelect: (id: string) => void;
};

/** Number of entries shown in the log. Preserved from the legacy `slice(0, 6)`. */
const VISIBLE = 6;

/** Recent grumbles, newest first. */
export const GrumbleHistory = memo(function GrumbleHistory({
  history,
  onSelect,
}: GrumbleHistoryProps) {
  return (
    <section aria-labelledby="history-heading">
      <p className="mb-[13px] font-mono text-xs leading-[normal] tracking-[1.3px] text-ember-soft">RECENT DAMAGE</p>
      <h2 id="history-heading" className="mb-[18px] text-[25px] tracking-[-1px]">
        Grumble log
      </h2>

      {history.length > 0 ? (
        <ul className="m-0 list-none p-0">
          {history.slice(0, VISIBLE).map((item) => (
            <li key={item.id} className="border-b border-slate-rule">
              <button
                type="button"
                onClick={() => onSelect(item.id)}
                className="flex w-full justify-between gap-[15px] border-0 bg-transparent py-[13px] text-left text-list"
              >
                <span>{item.text}</span>
                <small className="whitespace-nowrap text-ember-soft">
                  {item.favorite ? '★ ' : ''}
                  {item.tone}
                </small>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="my-4 text-muted">Your glorious procrastination record will appear here.</p>
      )}
    </section>
  );
});
