import { createClient, SupabaseClient, Session } from "@supabase/supabase-js";

const SUPABASE_URL = "https://knaydptymtnbeyjwirbx.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtuYXlkcHR5bXRuYmV5andpcmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NjQzMjUsImV4cCI6MjA5OTU0MDMyNX0.ySQY7BkIbQrr8JpzXh0j0uAWX1erKPZxiIrhq8z_Tvw";

let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    _client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: true,
      },
    });
  }
  return _client;
}

export async function signInWithEmail(email: string): Promise<{ error: string | null }> {
  const { error } = await getSupabase().auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true },
  });
  return { error: error?.message ?? null };
}

export async function verifyOtp(
  email: string,
  token: string
): Promise<{ session: Session | null; error: string | null }> {
  const { data, error } = await getSupabase().auth.verifyOtp({
    email,
    token,
    type: "email",
  });
  return { session: data.session, error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await getSupabase().auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await getSupabase().auth.getSession();
  return data.session;
}

export async function ensureVaultLinked(vaultName: string): Promise<string | null> {
  const supabase = getSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: existing } = await supabase
    .from("vaults")
    .select("id")
    .eq("user_id", user.id)
    .eq("name", vaultName)
    .maybeSingle();

  if (existing) return existing.id as string;

  const { data: created, error } = await supabase
    .from("vaults")
    .insert({ user_id: user.id, name: vaultName })
    .select("id")
    .single();

  if (error) return null;
  return created.id as string;
}
