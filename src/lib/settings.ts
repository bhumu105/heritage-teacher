import { supabase } from '@/lib/supabase'
import type { ConsentScope, UUID } from '@/lib/types'

export async function fetchFamilyName(familyId: UUID): Promise<string | null> {
  const { data, error } = await supabase
    .from('families')
    .select('name')
    .eq('id', familyId)
    .maybeSingle()
  if (error || !data) return null
  return data.name
}

export async function renameFamily(
  familyId: UUID,
  name: string
): Promise<string | null> {
  const { error } = await supabase
    .from('families')
    .update({ name })
    .eq('id', familyId)
  return error?.message ?? null
}

/**
 * Grant a consent scope if one isn't already active. Inserting a new row is
 * always safe — useTeacher only surfaces rows where revoked_at IS NULL, so
 * duplicates don't appear twice.
 */
export async function grantConsent(
  teacherId: UUID,
  scope: ConsentScope
): Promise<string | null> {
  const { error } = await supabase.from('consent_records').insert({
    teacher_id: teacherId,
    scope,
    granted_via: 'app-checkbox',
  })
  return error?.message ?? null
}

/**
 * Revoke all active rows for this (teacher, scope) by stamping revoked_at.
 * We revoke all active rows instead of just the latest because historical
 * duplicates shouldn't resurrect a revoked scope.
 */
export async function revokeConsent(
  teacherId: UUID,
  scope: ConsentScope
): Promise<string | null> {
  const { error } = await supabase
    .from('consent_records')
    .update({ revoked_at: new Date().toISOString() })
    .eq('teacher_id', teacherId)
    .eq('scope', scope)
    .is('revoked_at', null)
  return error?.message ?? null
}

/**
 * Delete the entire family row. ON DELETE CASCADE handles the rest of the
 * graph (members, teachers, consents, sessions, lessons). Audio files in
 * Storage are NOT removed by this — we keep them as a compliance record for
 * the consent clip. A later "export + purge" tool can do that if the user
 * needs a full wipe for GDPR.
 */
export async function deleteFamily(familyId: UUID): Promise<string | null> {
  const { error } = await supabase.from('families').delete().eq('id', familyId)
  return error?.message ?? null
}
