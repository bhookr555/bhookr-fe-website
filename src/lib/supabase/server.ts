import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || "";

if (!supabaseUrl && process.env.NODE_ENV !== "production") {
  console.warn("⚠️ SUPABASE_URL is not set in environment variables");
}

if (!supabaseServiceRoleKey && process.env.NODE_ENV !== "production") {
  console.warn("⚠️ SUPABASE_SERVICE_ROLE_KEY is not set in environment variables");
}

/**
 * Server-side Supabase client with admin privileges (service_role).
 * Used exclusively in API routes / backend logic to perform queries with full permissions.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});
