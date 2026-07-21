import { createClient } from "@supabase/supabase-js";

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY in .env — auth will not work."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Returns an Authorization header object with the current session token,
 * or an empty object if the user is not signed in.
 * Use this for API calls to protected backend endpoints.
 */
export async function getAuthHeader() {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}