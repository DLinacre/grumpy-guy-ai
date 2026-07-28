import { useState } from 'react';

interface ShareButtonProps {
  text: string;
  className?: string;
}

export function ShareButton({ text, className = 'icon' }: ShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Grumpy Guy AI',
          text: `"${text}" — Grumpy Guy AI`,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or API failed, fall back to copy
      }
    }

    try {
      await navigator.clipboard.writeText(`"${text}" — via Grumpy Guy AI`);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = `"${text}" — via Grumpy Guy AI`;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <button
      className={className}
      onClick={() => { void handleShare(); }}
      aria-label={copied ? 'Copied grumble to clipboard' : 'Share or copy grumble'}
      title={copied ? 'Copied!' : 'Share'}
    >
      {copied ? '✓' : '⎘'}
    </button>
  );
}
