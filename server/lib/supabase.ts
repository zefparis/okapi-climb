import { createClient, SupabaseClient } from '@supabase/supabase-js'
import 'dotenv/config'

const url = process.env.SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_KEY

let _client: SupabaseClient | null = null

export function getSupabase(): SupabaseClient | null {
  if (!url || !key) {
    return null
  }
  if (!_client) {
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return _client
}

/**
 * Adjusts a user's balance by calling the `adjust_balance` Postgres RPC.
 * Returns the new balance, or null if Supabase is not configured.
 */
export async function adjustBalance(
  userId: string,
  delta: number,
): Promise<number | null> {
  const sb = getSupabase()
  if (!sb) return null
  const { data, error } = await sb.rpc('adjust_balance', {
    p_user_id: userId,
    p_amount: delta,
  })
  if (error) throw new Error(error.message)
  return (data as unknown as number) ?? 0
}
