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

// Version of the community rules, terms and privacy policy (docs/legal). Change
// it, and the date at the top of each document, whenever they change in a way
// members should agree to again. Members are asked to accept the new version.
export const TERMS_VERSION = '2026-11-03';

// Where the public legal pages live (app/public, built from docs/legal).
export const SITE_URL: string =
  process.env.EXPO_PUBLIC_SITE_URL
  ?? (typeof window !== 'undefined' && typeof window.location?.origin === 'string' && window.location.origin.startsWith('http')
    ? window.location.origin
    : 'https://app-aad.pages.dev');

// The cities the app launches in. Members elsewhere can still join.
export const LAUNCH_CITIES = [
  { city: 'Dublin', country: 'IE' },
  { city: 'London', country: 'GB' },
] as const;
