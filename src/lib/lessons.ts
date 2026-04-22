import { supabase } from '@/lib/supabase'
import type { Lesson, RecordingSession, UUID } from '@/lib/types'

const SIGNED_URL_TTL_SECONDS = 60 * 60 // 1h — long enough for a detail page visit

/**
 * Fetch a single lesson plus its linked recording session. One round-trip via
 * a PostgREST embed. Returns null if the lesson doesn't exist or the caller
 * can't see it (RLS).
 */
export async function fetchLessonWithSession(id: UUID): Promise<{
  lesson: Lesson | null
  session: RecordingSession | null
  error: string | null
}> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*, recording_sessions!lessons_session_id_fkey(*)')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle()
  if (error) return { lesson: null, session: null, error: error.message }
  if (!data) return { lesson: null, session: null, error: null }
  // PostgREST nests the joined row under the relation name.
  const { recording_sessions, ...lesson } = data as Lesson & {
    recording_sessions: RecordingSession | null
  }
  return {
    lesson: lesson as Lesson,
    session: recording_sessions,
    error: null,
  }
}

/**
 * Signed URL for a private storage path. Safe to call from the browser —
 * Supabase checks the user's JWT against the bucket's RLS policies before
 * minting the URL. URL expires after SIGNED_URL_TTL_SECONDS.
 */
export async function createSignedAudioUrl(path: string): Promise<{
  url: string | null
  error: string | null
}> {
  const clean = path.replace(/^recordings\//, '')
  const { data, error } = await supabase.storage
    .from('recordings')
    .createSignedUrl(clean, SIGNED_URL_TTL_SECONDS)
  return { url: data?.signedUrl ?? null, error: error?.message ?? null }
}

/** Edit the lesson's transcript or translation. Updates `created_at`-neighbour fields only. */
export async function updateLesson(
  id: UUID,
  patch: Partial<Pick<Lesson, 'title' | 'transcript' | 'translation' | 'cultural_note'>>
): Promise<string | null> {
  const { error } = await supabase.from('lessons').update(patch).eq('id', id)
  return error?.message ?? null
}

/** Soft-delete: sets deleted_at. The audio file remains in Storage as the compliance artifact. */
export async function softDeleteLesson(id: UUID): Promise<string | null> {
  const { error } = await supabase
    .from('lessons')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
  return error?.message ?? null
}

/**
 * Lazily populate the cultural_note for a lesson that was recorded before
 * extract-note was wired in. No-op if the lesson already has one.
 */
export async function ensureCulturalNote(lessonId: UUID): Promise<{
  culturalNote: string | null
  error: string | null
}> {
  const { data, error } = await supabase.functions.invoke<{
    lesson_id: string
    cultural_note: string | null
  }>('extract-note', { body: { lesson_id: lessonId } })
  if (error) {
    return { culturalNote: null, error: error.message }
  }
  return { culturalNote: data?.cultural_note ?? null, error: null }
}
