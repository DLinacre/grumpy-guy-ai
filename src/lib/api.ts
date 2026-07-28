import type { Grumble, Tone } from '../types';
import { config } from './config';
import { supabase } from './supabase';

const fallback = (tone: Tone) => ({
  dry: ['Another tab, another tiny betrayal.', 'The plan is fine. Your calendar is the crime scene.', 'Ambition is cute. Ship it.'],
  brutal: ['You asked for momentum, then opened social media. Remarkable.', 'The deadline is not impressed by your intentions.', 'Less theatre. More commit messages.'],
  supportive: ['You are allowed to do the next small thing badly. Do it.', 'Progress has poor manners. It arrives one boring step at a time.', 'Still here? Good. That counts.']
}[tone][Math.floor(Math.random() * 3)]);

export async function requestGrumble(tone: Tone, prompt?: string): Promise<Grumble> {
  const token = (await supabase?.auth.getSession())?.data.session?.access_token;
  try {
    const response = await fetch(`${config.apiBaseUrl}/grumble`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: JSON.stringify({ tone, prompt })
    });
    if (!response.ok) throw new Error('Grumble service unavailable');
    return await response.json() as Grumble;
  } catch {
    // Deliberate offline/demo degradation; the production Worker is always authoritative.
    return { id: crypto.randomUUID(), text: fallback(tone), tone, createdAt: new Date().toISOString(), favorite: false };
  }
}
