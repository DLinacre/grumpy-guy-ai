export const config = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL as string | undefined,
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined,
  apiBaseUrl: (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? '/api'
};
export const supabaseConfigured = Boolean(config.supabaseUrl && config.supabaseAnonKey);
