import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/**
 * True when the frontend has Supabase credentials configured.
 * The UI uses this to show a friendly "configure Supabase" message instead of
 * crashing when the .env values are missing.
 */
export const isSupabaseConfigured = Boolean(url && anonKey);

if (!isSupabaseConfigured) {
  // eslint-disable-next-line no-console
  console.warn(
    '⚠️  Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to frontend/.env'
  );
}

// When unconfigured we still create a client with placeholder values so imports
// don't throw; calls will simply fail and surface a friendly error in the UI.
export const supabase: SupabaseClient = createClient(
  url || 'http://localhost:54321',
  anonKey || 'public-anon-key'
);

export const REPORT_IMAGES_BUCKET = 'report-images';
