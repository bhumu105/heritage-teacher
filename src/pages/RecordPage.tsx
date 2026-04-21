import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ConsentClipPrompt } from '@/components/ConsentClipPrompt'
import { LessonCapture } from '@/components/LessonCapture'
import { RecordingStatus, type StatusStep } from '@/components/RecordingStatus'
import { useAuth } from '@/hooks/useAuth'
import { useTeacher } from '@/hooks/useTeacher'
import type { RecordingResult } from '@/hooks/useRecording'
import { supabase } from '@/lib/supabase'
import {
  attachConsentClip,
  attachLessonAudio,
  createRecordingSession,
  invokeTranscribe,
  invokeTranslate,
  uploadToRecordings,
} from '@/lib/recording'
import type { UUID } from '@/lib/types'

type Phase =
  | 'loading'
  | 'no-record-consent'
  | 'needs-consent-clip'
  | 'ready-to-record'
  | 'processing'
  | 'done'
  | 'error'

const LANGUAGE_NAMES: Record<string, string> = {
  sl: 'Slovene',
  de: 'German',
  fr: 'French',
  uk: 'Ukrainian',
  tl: 'Tagalog',
  es: 'Spanish',
  it: 'Italian',
  hr: 'Croatian',
  sr: 'Serbian',
  pl: 'Polish',
  ru: 'Russian',
  hu: 'Hungarian',
  pt: 'Portuguese',
}

function languageLabel(code: string): string {
  const lower = code.toLowerCase()
  return LANGUAGE_NAMES[lower] ?? code.toUpperCase()
}

export function RecordPage() {
  const navigate = useNavigate()
  const { familyId } = useAuth()
  const {
    loading: loadingTeacher,
    teacher,
    has: hasConsent,
    error: teacherError,
  } = useTeacher(familyId)

  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionId, setSessionId] = useState<UUID | null>(null)
  const [statusStep, setStatusStep] = useState<StatusStep>('uploading')
  const [transcript, setTranscript] = useState<string | null>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  // Decide the next phase once the teacher + consents load.
  if (phase === 'loading' && !loadingTeacher) {
    if (teacherError) {
      setErrorMsg(teacherError)
      setPhase('error')
    } else if (!teacher) {
      setErrorMsg('No teacher profile found. Complete onboarding first.')
      setPhase('error')
    } else if (!hasConsent('record')) {
      setPhase('no-record-consent')
    } else {
      setPhase('needs-consent-clip')
    }
  }

  async function ensureSession(): Promise<UUID | null> {
    if (sessionId) return sessionId
    if (!familyId || !teacher) return null
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) {
      setErrorMsg('Your session expired — sign in again.')
      setPhase('error')
      return null
    }
    const { session, error } = await createRecordingSession(
      familyId,
      teacher.id,
      userData.user.id
    )
    if (error || !session) {
      setErrorMsg(error ?? 'Could not start a recording session')
      setPhase('error')
      return null
    }
    setSessionId(session.id)
    return session.id
  }

  async function onConsentCaptured(result: RecordingResult) {
    if (!familyId) return
    const sid = await ensureSession()
    if (!sid) return

    const { path, error: upErr } = await uploadToRecordings(
      familyId,
      sid,
      'consent',
      result.extension,
      result.blob
    )
    if (upErr) {
      setErrorMsg(`Consent upload failed: ${upErr}`)
      setPhase('error')
      return
    }
    const attachErr = await attachConsentClip(sid, path)
    if (attachErr) {
      setErrorMsg(`Could not save consent clip: ${attachErr}`)
      setPhase('error')
      return
    }
    setPhase('ready-to-record')
  }

  async function onLessonCommitted(result: RecordingResult) {
    if (!familyId || !sessionId) return
    setUploading(true)
    setPhase('processing')
    setStatusStep('uploading')
    setTranscript(null)
    setTranslation(null)
    setErrorMsg(null)

    // 1. Upload audio.
    const { path, error: upErr } = await uploadToRecordings(
      familyId,
      sessionId,
      'audio',
      result.extension,
      result.blob
    )
    if (upErr) {
      setErrorMsg(`Upload failed: ${upErr}`)
      setPhase('error')
      setUploading(false)
      return
    }
    const attachErr = await attachLessonAudio(sessionId, path, result.durationSeconds)
    if (attachErr) {
      setErrorMsg(`Could not attach audio to session: ${attachErr}`)
      setPhase('error')
      setUploading(false)
      return
    }

    // 2. Transcribe (server-side Whisper).
    setStatusStep('transcribing')
    const { lessonId, transcript: tx, error: txErr } = await invokeTranscribe(sessionId)
    if (txErr || !lessonId) {
      setErrorMsg(`Transcription failed: ${txErr ?? 'no lesson id returned'}`)
      setPhase('error')
      setUploading(false)
      return
    }
    setTranscript(tx ?? '')

    // 3. Translate (server-side Claude) — fire and await; cheap enough we don't
    //    background it.
    setStatusStep('translating')
    const { translation: tr, error: trErr } = await invokeTranslate(lessonId)
    if (trErr) {
      // Transcript still counts as a successful capture; surface as soft error.
      setErrorMsg(`Translation failed, but transcript saved: ${trErr}`)
      setStatusStep('done')
      setUploading(false)
      return
    }
    setTranslation(tr ?? '')
    setStatusStep('done')
    setPhase('done')
    setUploading(false)
  }

  function startAnother() {
    setSessionId(null)
    setTranscript(null)
    setTranslation(null)
    setErrorMsg(null)
    setStatusStep('uploading')
    setPhase('needs-consent-clip')
  }

  // ----- Render -----
  if (phase === 'loading' || loadingTeacher) {
    return (
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (phase === 'no-record-consent') {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Consent not granted</CardTitle>
            <CardDescription>
              The "record" consent scope hasn't been granted for {teacher?.display_name ?? 'this teacher'}.
              Go back to onboarding to grant it, or ask the family owner.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/library">Back to library</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const langName = languageLabel(teacher?.native_language ?? '')
  const teacherName = teacher?.display_name ?? 'your grandparent'

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Record a lesson</h1>
          <p className="text-sm text-muted-foreground">
            {teacherName} · {langName}
          </p>
        </div>
        <Button asChild variant="outline" size="sm">
          <Link to="/library">Back to library</Link>
        </Button>
      </header>

      {phase === 'needs-consent-clip' && (
        <ConsentClipPrompt
          teacherName={teacherName}
          languageName={langName}
          onCaptured={onConsentCaptured}
        />
      )}

      {phase === 'ready-to-record' && (
        <LessonCapture
          teacherName={teacherName}
          onCommit={onLessonCommitted}
          uploading={uploading}
        />
      )}

      {(phase === 'processing' || phase === 'done') && (
        <>
          <RecordingStatus
            step={statusStep}
            transcript={transcript}
            translation={translation}
            errorMsg={errorMsg}
          />
          {phase === 'done' && (
            <div className="flex gap-3">
              <Button onClick={startAnother} className="flex-1">
                Record another
              </Button>
              <Button asChild variant="outline" className="flex-1">
                <Link to="/library">Back to library</Link>
              </Button>
            </div>
          )}
        </>
      )}

      {phase === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle>Recording failed</CardTitle>
            <CardDescription>{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(0)}>Try again</Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
