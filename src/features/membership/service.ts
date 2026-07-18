import type { SupabaseClient } from '@supabase/supabase-js';

import { parseAccessContext, type AccessContext } from './accessContext';

export async function fetchMyAccessContext(client: SupabaseClient): Promise<AccessContext> {
  const { data, error } = await client.rpc('get_my_access_context');
  if (error) throw new Error('Akses membership belum dapat dimuat. Silakan coba kembali.');
  return parseAccessContext(data);
}
