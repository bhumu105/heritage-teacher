import { supabase } from '@/lib/supabase'
import type { Lesson, RecordingSession, UUID } from '@/lib/types'

/**
 * Upload a captured blob to the private `recordings` bucket, honouring the
 * {family_id}/{session_id}/{filename} path convention that the storage RLS
 * policies enforce. Returns the storage path (NOT a public URL).
 */
export async function uploadToRecordings(
  familyId: UUID,
  sessionId: UUID,
  filenameNoExt: string,
  extension: string,
  blob: Blob
): Promise<{ path: string; error: string | null }> {
  const path = `${familyId}/${sessionId}/${filenameNoExt}.${extension}`
  const { error } = await supabase.storage.from('recordings').upload(path, blob, {
    contentType: blob.type,
    upsert: true,
  })
  return { path, error: error?.message ?? null }
}

/**
 * Create an open session row. URIs are set to null now and populated after
 * the consent clip + main audio uploads finish.
 */
export async function createRecordingSession(
  familyId: UUID,
  teacherId: UUID,
  recordedBy: UUID
): Promise<{ session: RecordingSession | null; error: string | null }> {
  const { data, error } = await supabase
    .from('recording_sessions')
    .insert({
      family_id: familyId,
      teacher_id: teacherId,
      recorded_by: recordedBy,
      status: 'pending',
    })
    .select('*')
    .single()
  return { session: data, error: error?.message ?? null }
}

export async function attachConsentClip(
  sessionId: UUID,
  path: string
): Promise<string | null> {
  const { error } = await supabase
    .from('recording_sessions')
    .update({ consent_clip_uri: path })
    .eq('id', sessionId)
  return error?.message ?? null
}

export async function attachLessonAudio(
  sessionId: UUID,
  path: string,
  durationSeconds: number
): Promise<string | null> {
  const { error } = await supabase
    .from('recording_sessions')
    .update({ raw_audio_uri: path, duration_seconds: durationSeconds })
    .eq('id', sessionId)
  return error?.message ?? null
}

/**
 * Triggers the transcribe Edge Function — which in turn writes the lessons
 * row and flips session.status to 'ready'. Returns the transcript on success.
 */
export async function invokeTranscribe(sessionId: UUID): Promise<{
  lessonId: UUID | null
  transcript: string | null
  error: string | null
}> {
  const { data, error } = await supabase.functions.invoke<{
    lesson_id: string
    transcript: string
    language_code: string
  }>('transcribe', { body: { session_id: sessionId } })
  if (error) return { lessonId: null, transcript: null, error: error.message }
  return {
    lessonId: data?.lesson_id ?? null,
    transcript: data?.transcript ?? null,
    error: null,
  }
}

/**
 * Triggers the translate Edge Function. Safe to call multiple times — the
 * function short-circuits if `lesson.translation` is already populated.
 */
export async function invokeTranslate(lessonId: UUID): Promise<{
  translation: string | null
  error: string | null
}> {
  const { data, error } = await supabase.functions.invoke<{
    lesson_id: string
    translation: string
  }>('translate', { body: { lesson_id: lessonId } })
  if (error) return { translation: null, error: error.message }
  return { translation: data?.translation ?? null, error: null }
}

/**
 * Fetch a lesson by id. Used after transcription to read back the final row
 * (and again after translation if we want to display without a separate
 * round-trip).
 */
export async function fetchLesson(lessonId: UUID): Promise<Lesson | null> {
  const { data, error } = await supabase
    .from('lessons')
    .select('*')
    .eq('id', lessonId)
    .single()
  if (error) {
    console.error('[recording] fetchLesson failed', error.code)
    return null
  }
  return data
}
