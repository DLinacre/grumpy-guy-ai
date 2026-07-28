import { useEffect, useRef } from 'react';

interface LegalModalProps {
  type: 'privacy' | 'terms';
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const focusable = dialog.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    first?.focus();

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose} role="presentation">
      <div
        ref={dialogRef}
        className="dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="legal-title"
        onClick={e => e.stopPropagation()}
      >
        <button className="close" onClick={onClose} aria-label="Close dialog">×</button>
        <h2 id="legal-title">{type === 'privacy' ? 'Privacy Policy' : 'Terms of Service'}</h2>
        
        {type === 'privacy' ? (
          <div>
            <p><strong>Last updated: 28 July 2026</strong></p>
            <h3>1. Data We Collect</h3>
            <p>Grumpy Guy AI stores your preferences, tone choices, and grumble history locally in your browser's <code>localStorage</code>. If you choose to sign in, your email address and saved grumbles are stored securely via Supabase.</p>

            <h3>2. How Prompts Are Processed</h3>
            <p>Prompts entered into the composer are sent to our Cloudflare Worker API to generate responses via OpenAI. Prompts are not sold or used for marketing profiling.</p>

            <h3>3. Third-Party Services</h3>
            <p>We use Cloudflare Workers (API Hosting), Supabase (Auth/Database), and GitHub Pages (Static Hosting). No invasive advertising tracking pixels are loaded.</p>

            <h3>4. Your Rights (UK GDPR)</h3>
            <p>You can clear your local data anytime using the "Clear local history" button. For account deletion or data requests, contact us via GitHub Issues.</p>
          </div>
        ) : (
          <div>
            <p><strong>Last updated: 28 July 2026</strong></p>
            <h3>1. Acceptance of Terms</h3>
            <p>By accessing Grumpy Guy AI, you agree to use the application responsibly and in accordance with applicable laws.</p>

            <h3>2. Product Nature & Output</h3>
            <p>Grumpy Guy AI provides satirical, humorous productivity grumbles and motivation. Output is generated dynamically for comedic and productivity check purposes.</p>

            <h3>3. Intellectual Property & License</h3>
            <p>Grumpy Guy AI is open source software distributed under the MIT License. Source code is accessible at GitHub (DLinacre/grumpy-guy-ai).</p>

            <h3>4. Disclaimer of Warranties</h3>
            <p>The service is provided "as is" without warranty of any kind. We are not liable for missed deadlines, bruised egos, or extreme motivation.</p>
          </div>
        )}
      </div>
    </div>
  );
}
