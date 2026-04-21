import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { ConsentScope, Teacher } from '@/lib/types'

interface UseTeacherResult {
  loading: boolean
  teacher: Teacher | null
  activeScopes: Set<ConsentScope>
  error: string | null
  /** Convenience: does the teacher have an active consent for `scope`? */
  has: (scope: ConsentScope) => boolean
  refresh: () => Promise<void>
}

/**
 * Loads the first teacher for a family + the set of currently-active consent
 * scopes (revoked_at IS NULL). Used by the record page to short-circuit if
 * the grandparent hasn't granted `record` consent yet.
 */
export function useTeacher(familyId: string | null): UseTeacherResult {
  const [loading, setLoading] = useState(true)
  const [teacher, setTeacher] = useState<Teacher | null>(null)
  const [activeScopes, setActiveScopes] = useState<Set<ConsentScope>>(new Set())
  const [error, setError] = useState<string | null>(null)

  async function load() {
    if (!familyId) {
      setTeacher(null)
      setActiveScopes(new Set())
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    const { data: teachers, error: tErr } = await supabase
      .from('teachers')
      .select('*')
      .eq('family_id', familyId)
      .limit(1)
    if (tErr) {
      setError(tErr.message)
      setLoading(false)
      return
    }
    const t = teachers?.[0] ?? null
    setTeacher(t)

    if (!t) {
      setActiveScopes(new Set())
      setLoading(false)
      return
    }

    const { data: consents, error: cErr } = await supabase
      .from('consent_records')
      .select('scope')
      .eq('teacher_id', t.id)
      .is('revoked_at', null)
    if (cErr) {
      setError(cErr.message)
      setLoading(false)
      return
    }
    setActiveScopes(new Set((consents ?? []).map((c) => c.scope as ConsentScope)))
    setLoading(false)
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [familyId])

  return {
    loading,
    teacher,
    activeScopes,
    error,
    has: (scope) => activeScopes.has(scope),
    refresh: load,
  }
}
