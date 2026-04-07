import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing required environment variables:\n" +
    "  NEXT_PUBLIC_SUPABASE_URL\n" +
    "  NEXT_PUBLIC_SUPABASE_ANON_KEY\n" +
    "Please add them to your .env.local file."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
