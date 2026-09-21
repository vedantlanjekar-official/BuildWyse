export const env = {
  apiUrl: import.meta.env.VITE_API_URL ?? 'http://localhost:8000',
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL ?? '',
  supabaseAnonKey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
  devAuth: import.meta.env.VITE_DEV_AUTH === 'true',
} as const
