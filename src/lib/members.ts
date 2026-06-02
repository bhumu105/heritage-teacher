import { supabase } from '@/lib/supabase'
import type { FamilyMember, UUID } from '@/lib/types'

/**
 * Members of a family the caller is already in. RLS (`fm_read`) limits the
 * result to the caller's own family, so the equality filter is a hint for
 * Postgres rather than a security boundary.
 */
export async function listFamilyMembers(
  familyId: UUID
): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select('*')
    .eq('family_id', familyId)
    .order('added_at', { ascending: true })
  if (error || !data) return []
  return data as FamilyMember[]
}

/**
 * Remove someone from the family. RLS (`fm_delete_owner`) requires the caller
 * to be the family's creator; non-owners get a permission error.
 */
export async function removeFamilyMember(
  familyId: UUID,
  userId: UUID
): Promise<string | null> {
  const { error } = await supabase
    .from('family_members')
    .delete()
    .eq('family_id', familyId)
    .eq('user_id', userId)
  return error?.message ?? null
}
