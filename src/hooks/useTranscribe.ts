import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export interface TranscribeResult {
  lesson_id: string
  transcript: string
  language_code: string
}

export function useTranscribe() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function transcribe(sessionId: string): Promise<TranscribeResult | null> {
    setLoading(true)
    setError(null)
    try {
      const { data, error: fnErr } = await supabase.functions.invoke<TranscribeResult>(
        'transcribe',
        { body: { session_id: sessionId } }
      )
      if (fnErr) throw fnErr
      return data ?? null
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e))
      return null
    } finally {
      setLoading(false)
    }
  }

  return { transcribe, loading, error }
}
