import { supabase } from '@/lib/supabase'
import type { ConsentRecord, UUID } from '@/lib/types'

/**
 * Active (not revoked) consent rows for a teacher, newest first. Returns the
 * full row so callers can show `granted_via` and `granted_at` in the UI.
 */
export async function listActiveConsents(
  teacherId: UUID
): Promise<ConsentRecord[]> {
  const { data, error } = await supabase
    .from('consent_records')
    .select('*')
    .eq('teacher_id', teacherId)
    .is('revoked_at', null)
    .order('granted_at', { ascending: false })
  if (error || !data) return []
  return data as ConsentRecord[]
}

/**
 * Attest that a paper consent form is on file for this teacher. This is the
 * gating consent for the record flow — without an active `record` row the
 * RecordPage refuses to start a session. Distinct from the generic
 * `grantConsent` in settings.ts which uses `granted_via: 'app-checkbox'` for
 * the per-scope toggle; here we record the stronger paper-form attestation.
 */
export async function grantRecordConsentFromPaperForm(
  teacherId: UUID
): Promise<string | null> {
  const { error } = await supabase.from('consent_records').insert({
    teacher_id: teacherId,
    scope: 'record',
    granted_via: 'paper-signed',
  })
  return error?.message ?? null
}
