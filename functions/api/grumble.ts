import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

type Env = { OPENAI_API_KEY: string; SUPABASE_URL: string; SUPABASE_SERVICE_ROLE_KEY: string; ALLOWED_ORIGIN: string };
type Variables = { userId?: string };
const app = new Hono<{ Bindings: Env; Variables: Variables }>();
app.use('*', async (c, next) => cors({ origin: c.env.ALLOWED_ORIGIN, allowHeaders: ['Content-Type', 'Authorization'], allowMethods: ['POST', 'OPTIONS'], maxAge: 86400 })(c, next));
const input = z.object({ tone: z.enum(['dry', 'brutal', 'supportive']).default('dry'), prompt: z.string().trim().max(500).optional() });
const system = `You are Grumpy GuyAI: a witty, mildly grumpy productivity companion for hackers and hustlers. Return exactly one original sentence, 8–35 words. Be playful, never cruel; do not insult protected traits, give medical/legal/financial advice, threaten, or use profanity. Do not claim consciousness. Tone: `;

async function authenticatedUser(c: Context<{ Bindings: Env }>): Promise<string | undefined> {
 const token = c.req.header('Authorization')?.replace(/^Bearer\s+/i, ''); if (!token) return undefined;
 const r = await fetch(`${c.env.SUPABASE_URL}/auth/v1/user`, { headers: { Authorization: `Bearer ${token}`, apikey: c.env.SUPABASE_SERVICE_ROLE_KEY } });
 if (!r.ok) return undefined; const user = await r.json() as { id: string }; return user.id;
}
app.post('/grumble', async c => {
 const parsed = input.safeParse(await c.req.json().catch(() => null)); if (!parsed.success) return c.json({ error: 'Invalid request', details: parsed.error.flatten() }, 400);
 const userId = await authenticatedUser(c); const { tone, prompt } = parsed.data;
 const completion = await fetch('https://api.openai.com/v1/chat/completions', { method: 'POST', headers: { Authorization: `Bearer ${c.env.OPENAI_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ model: 'gpt-4o-mini', temperature: .9, max_tokens: 80, messages: [{ role: 'system', content: system + tone }, { role: 'user', content: prompt ? `Context: ${prompt}` : 'Give me a grumble.' }] }) });
 if (!completion.ok) return c.json({ error: 'Generation temporarily unavailable' }, 502);
 const payload = await completion.json() as { choices?: { message?: { content?: string } }[] }; const text = payload.choices?.[0]?.message?.content?.trim();
 if (!text) return c.json({ error: 'Empty generation' }, 502);
 const row = { user_id: userId ?? null, content: text.slice(0, 1000), tone };
 if (userId) await fetch(`${c.env.SUPABASE_URL}/rest/v1/grumbles`, { method: 'POST', headers: { apikey: c.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${c.env.SUPABASE_SERVICE_ROLE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=representation' }, body: JSON.stringify(row) });
 return c.json({ id: crypto.randomUUID(), text: row.content, tone, createdAt: new Date().toISOString(), favorite: false });
});
app.notFound(c => c.json({ error: 'Not found' }, 404));
export default app;
