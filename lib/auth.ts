import { createClient } from '@/lib/supabase/client'

export async function signOut() {
  await createClient().auth.signOut()
}
