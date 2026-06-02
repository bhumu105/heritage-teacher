import { supabase } from '@/lib/supabase'
import type { FamilyInvite, UUID } from '@/lib/types'

export interface CreatedInvite {
  code: string
  expires_at: string
}

export async function createInvite(
  familyId: UUID,
  createdBy: UUID
): Promise<{ invite: CreatedInvite } | { error: string }> {
  const code = crypto.randomUUID()
  const { data, error } = await supabase
    .from('family_invites')
    .insert({ code, family_id: familyId, created_by: createdBy })
    .select('code, expires_at')
    .single()
  if (error || !data) return { error: error?.message ?? 'Insert returned no row.' }
  return { invite: { code: data.code, expires_at: data.expires_at } }
}

export async function listOpenInvites(familyId: UUID): Promise<FamilyInvite[]> {
  const { data, error } = await supabase
    .from('family_invites')
    .select('*')
    .eq('family_id', familyId)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data as FamilyInvite[]
}

export async function consumeInvite(
  code: string
): Promise<{ familyId: UUID } | { error: string }> {
  const { data, error } = await supabase.rpc('consume_family_invite', {
    invite_code: code,
  })
  if (error) return { error: error.message }
  if (!data) return { error: 'No family returned from invite.' }
  return { familyId: data as UUID }
}

export function inviteUrl(code: string): string {
  return `${window.location.origin}/join/${code}`
}

/**
 * sessionStorage key for an invite code stashed by JoinPage when the user
 * landed there signed-out. LoginPage reads it to redirect back after auth,
 * and JoinPage clears it once redemption succeeds.
 */
export const PENDING_INVITE_KEY = 'heritage-teacher:pending-invite'
