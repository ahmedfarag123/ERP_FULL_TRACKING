import type { SupabaseClient, User } from '@supabase/supabase-js'

type MinimalSupabaseClient = Pick<SupabaseClient, 'from'>
type ProfileLookupUser = Pick<User, 'id' | 'email'>

const NO_ROWS_ERROR_CODE = 'PGRST116'

async function findProfileByField<T extends Record<string, unknown>>(
  client: MinimalSupabaseClient,
  field: 'id' | 'email',
  value: string
): Promise<T | null> {
  const { data, error } = await client.from('profiles').select('*').eq(field, value).maybeSingle()

  if (error) {
    if (error.code === NO_ROWS_ERROR_CODE) {
      return null
    }
    throw error
  }

  return (data as T | null) ?? null
}

export async function findProfileByAuthUser<T extends Record<string, unknown>>(
  client: MinimalSupabaseClient,
  authUser: ProfileLookupUser
): Promise<T | null> {
  const attempts: Array<{ field: 'id' | 'email'; value: string | null }> = [
    { field: 'id', value: authUser.id },
    { field: 'email', value: authUser.email?.trim().toLowerCase() ?? null },
  ]

  for (const attempt of attempts) {
    if (!attempt.value) continue
    const profile = await findProfileByField<T>(client, attempt.field, attempt.value)
    if (profile) return profile
  }

  return null
}
