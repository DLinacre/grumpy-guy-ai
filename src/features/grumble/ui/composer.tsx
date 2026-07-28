import { memo, type KeyboardEvent } from 'react';
import { MAX_PROMPT_LENGTH } from '../../../shared/domain/grumble';

export type ComposerProps = {
  prompt: string;
  loading: boolean;
  onPromptChange: (value: string) => void;
  onSubmit: () => void;
};

/** Hero prompt input and the primary generate action. */
export const Composer = memo(function Composer({
  prompt,
  loading,
  onPromptChange,
  onSubmit,
}: ComposerProps) {
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' && !loading) {
      event.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className="flex max-w-[670px] gap-[10px] max-[650px]:block">
      <input
        value={prompt}
        maxLength={MAX_PROMPT_LENGTH}
        onChange={(event) => onPromptChange(event.target.value)}
        onKeyDown={handleKeyDown}
        aria-label="Optional context"
        placeholder="What are you avoiding?"
        className="flex-1 rounded-[7px] border border-slate-edge bg-field px-4 py-[15px] text-white focus:border-ember max-[650px]:mb-[10px] max-[650px]:w-full"
      />
      <button
        type="button"
        onClick={onSubmit}
        disabled={loading}
        className="rounded-[7px] border-0 bg-ember px-[19px] py-[13px] font-bold text-espresso max-[650px]:mb-[10px] max-[650px]:w-full"
      >
        {loading ? 'Grumbling…' : 'Make him grumble'}
      </button>
    </div>
  );
});
