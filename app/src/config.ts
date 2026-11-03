// Working name. Change it here when the real name is chosen.
export const APP_NAME = 'Sangam';

// Public Supabase settings. The anon key is designed to ship in the app;
// row-level security in supabase/migrations is what protects the data.
// Never put the service-role key in the app.
export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

// Without Supabase settings the app runs on built-in sample data, so it can be
// previewed and tested without any accounts.
export const DEMO_MODE = !SUPABASE_URL || !SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_DEMO === '1';

// The cities the app launches in. Members elsewhere can still join.
export const LAUNCH_CITIES = [
  { city: 'Dublin', country: 'IE' },
  { city: 'London', country: 'GB' },
] as const;
