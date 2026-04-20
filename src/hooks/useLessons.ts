import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { Lesson } from '@/lib/types'

export function useLessons(familyId: string | null) {
  const [lessons, setLessons] = useState<Lesson[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!familyId) {
      setLessons([])
      return
    }
    setLoading(true)
    setError(null)

    supabase
      .from('lessons')
      .select('*')
      .eq('family_id', familyId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message)
        else setLessons(data ?? [])
        setLoading(false)
      })

    const channel = supabase
      .channel(`lessons:${familyId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'lessons', filter: `family_id=eq.${familyId}` },
        (payload) => {
          setLessons((prev) => {
            if (payload.eventType === 'INSERT') return [payload.new as Lesson, ...prev]
            if (payload.eventType === 'UPDATE')
              return prev.map((l) => (l.id === (payload.new as Lesson).id ? (payload.new as Lesson) : l))
            if (payload.eventType === 'DELETE')
              return prev.filter((l) => l.id !== (payload.old as Lesson).id)
            return prev
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [familyId])

  return { lessons, loading, error }
}
