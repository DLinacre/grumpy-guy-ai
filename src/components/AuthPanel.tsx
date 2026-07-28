import { useState } from 'react';
import { supabase } from '../lib/supabase';

export function AuthPanel({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState(''); const [message, setMessage] = useState(''); const [busy, setBusy] = useState(false);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (!supabase) return setMessage('Cloud sign-in is not configured. This browser is in private demo mode.');
    setBusy(true); const { error } = await supabase.auth.signInWithOtp({ email, options: { emailRedirectTo: window.location.origin } });
    setMessage(error ? error.message : 'Check your inbox for your secure sign-in link.'); setBusy(false);
  }
  return <div className="overlay" role="dialog" aria-modal="true" aria-labelledby="auth-title"><form className="dialog" onSubmit={submit}><button className="close" type="button" onClick={onClose} aria-label="Close">×</button><p className="eyebrow">SAVE YOUR GRUMBLES</p><h2 id="auth-title">Sign in. Reluctantly.</h2><p>We send a passwordless magic link. No passwords to forget dramatically.</p><label>Email<input required type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@shipit.dev" /></label><button className="primary" disabled={busy}>{busy ? 'Sending…' : 'Email me a link'}</button>{message && <p className="message">{message}</p>}</form></div>;
}
