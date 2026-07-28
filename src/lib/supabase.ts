import { createClient } from '@supabase/supabase-js';
import { config, supabaseConfigured } from './config';

// The client is only constructed with the browser-safe anonymous key.
export const supabase = supabaseConfigured
  ? createClient(config.supabaseUrl!, config.supabaseAnonKey!, { auth: { persistSession: true, autoRefreshToken: true } })
  : null;
