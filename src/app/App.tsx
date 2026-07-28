import { Suspense, lazy, useCallback, useState } from 'react';
import { config } from '../shared/config/env';
import { useSpeech } from '../shared/hooks/use-speech';
import { useAuth } from '../features/auth/api/use-auth';
import { useGrumbleSession } from '../features/grumble/model/use-grumble-session';
import { Composer } from '../features/grumble/ui/composer';
import { GrumbleHistory } from '../features/grumble/ui/grumble-history';
import { GrumbleStage } from '../features/grumble/ui/grumble-stage';
import { SettingsPanel } from '../features/preferences/ui/settings-panel';

/**
 * The auth dialog is only reachable behind a click, and it is the sole consumer of
 * the Supabase SDK. Lazy-loading keeps both out of the initial bundle.
 */
const AuthDialog = lazy(() =>
  import('../features/auth/ui/auth-dialog').then((module) => ({ default: module.AuthDialog })),
);

/**
 * Application shell.
 *
 * Composition only: all session logic lives in `useGrumbleSession`, auth in `useAuth`,
 * and speech in `useSpeech`. The legacy `App` held every one of those concerns plus
 * the entire layout in a single function.
 */
export default function App() {
  const { speak, supported: speechSupported } = useSpeech();
  const session = useGrumbleSession({ speak, speechSupported });
  const { email, signOut } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);

  const openAuth = useCallback(() => setAuthOpen(true), []);
  const closeAuth = useCallback(() => setAuthOpen(false), []);

  const handleAccountAction = useCallback(() => {
    if (email) void signOut();
    else setAuthOpen(true);
  }, [email, signOut]);

  const handleGenerate = useCallback(() => {
    void session.generate();
  }, [session]);

  return (
    <main
      className={`mx-auto min-h-screen max-w-[1120px] px-[30px] pb-[50px] pt-[26px] max-[650px]:p-5 ${
        session.preferences.reducedMotion ? 'reduce-motion' : ''
      }`}
    >
      <header className="flex items-center justify-between">
        {/* Uses the Vite base path: a bare "/" 404s under GitHub Pages sub-path hosting. */}
        <a
          href={config.baseUrl}
          className="text-[18px] leading-[1.45] font-bold tracking-[-1px] text-bone no-underline"
        >
          GRUMPY <i className="not-italic text-ember">GUY</i>AI
        </a>
        <div>
          <span className="mr-4 font-mono text-[13px] leading-[normal] text-ash max-[650px]:hidden">
            {email ?? 'Private mode'}
          </span>
          <button
            type="button"
            onClick={handleAccountAction}
            className="border-0 bg-transparent p-2 text-bone underline underline-offset-4"
          >
            {email ? 'Sign out' : 'Sign in'}
          </button>
        </div>
      </header>

      <section className="max-w-[800px] pb-[52px] pt-[105px] max-[650px]:pb-[42px] max-[650px]:pt-[70px]">
        <p className="mb-[13px] font-mono text-xs leading-[normal] tracking-[1.3px] text-ember-soft">
          YOUR DISAGREEABLE COPILOT
        </p>
        <h1 className="mb-[22px] text-[clamp(48px,8vw,94px)] leading-[.94] tracking-[-5px] max-[650px]:tracking-[-3px]">
          Motivation, <em className="not-italic text-ember">with complaints.</em>
        </h1>
        <p className="mb-7 text-[20px] leading-[1.45] text-quote">
          Ask for a reality check, or press the button and let him mutter.
        </p>
        <Composer
          prompt={session.prompt}
          loading={session.loading}
          onPromptChange={session.setPrompt}
          onSubmit={handleGenerate}
        />
      </section>

      <GrumbleStage
        current={session.current}
        error={session.error}
        speechSupported={session.speechSupported}
        onSpeak={session.speak}
        onToggleFavorite={session.toggleFavorite}
      />

      <div className="grid grid-cols-2 gap-20 py-[60px] max-[650px]:grid-cols-1 max-[650px]:gap-12">
        <GrumbleHistory history={session.history} onSelect={session.select} />
        <SettingsPanel
          preferences={session.preferences}
          onChange={session.setPreferences}
          onClear={session.clearHistory}
        />
      </div>

      <footer className="border-t border-slate-line pt-5 font-mono text-[13px] leading-[normal] text-ash-dim">
        Built for people who ship anyway.{' '}
        <button
          type="button"
          onClick={openAuth}
          className="border-0 bg-transparent p-2 text-bone underline underline-offset-4"
        >
          Back up your data
        </button>
      </footer>

      {authOpen && (
        <Suspense fallback={null}>
          <AuthDialog onClose={closeAuth} />
        </Suspense>
      )}
    </main>
  );
}
