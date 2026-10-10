import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, FileText, Loader2, Mic } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Label } from '@/components/ui/label'
import { ConsentClipPrompt } from '@/components/ConsentClipPrompt'
import { LessonCapture } from '@/components/LessonCapture'
import { RecordingStatus, type StatusStep } from '@/components/RecordingStatus'
import { useAuth } from '@/hooks/useAuth'
import { useTeacher } from '@/hooks/useTeacher'
import type { RecordingResult } from '@/hooks/useRecording'
import { supabase } from '@/lib/supabase'
import { grantRecordConsentFromPaperForm } from '@/lib/consents'
import { languageLabel } from '@/lib/languages'
import {
  attachConsentClip,
  attachLessonAudio,
  createRecordingSession,
  invokeTranscribe,
  invokeTranslate,
  uploadToRecordings,
} from '@/lib/recording'
import { cn } from '@/lib/utils'
import type { UUID } from '@/lib/types'

type Phase =
  | 'loading'
  | 'no-record-consent'
  | 'needs-consent-clip'
  | 'ready-to-record'
  | 'processing'
  | 'done'
  | 'error'

const STEPS = ['Permission', 'Lesson', 'Saved'] as const

function stepIndex(phase: Phase): number {
  if (phase === 'needs-consent-clip') return 0
  if (phase === 'ready-to-record') return 1
  return 2
}

function Stepper({ phase }: { phase: Phase }) {
  const current = stepIndex(phase)
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {STEPS.map((label, i) => {
        const done = i < current || phase === 'done'
        const active = i === current && phase !== 'done'
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                done && 'bg-green-600 text-white',
                active && 'bg-accent text-accent-foreground',
                !done && !active && 'bg-muted text-muted-foreground'
              )}
            >
              {done ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span
              className={cn(
                'text-sm',
                active ? 'font-medium' : 'text-muted-foreground'
              )}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        )
      })}
    </ol>
  )
}

export function RecordPage() {
  const navigate = useNavigate()
  const { familyId } = useAuth()
  const {
    loading: loadingTeacher,
    teacher,
    has: hasConsent,
    error: teacherError,
    refresh: refreshTeacher,
  } = useTeacher(familyId)

  const [phase, setPhase] = useState<Phase>('loading')
  const [sessionId, setSessionId] = useState<UUID | null>(null)
  const [lessonId, setLessonId] = useState<UUID | null>(null)
  const [statusStep, setStatusStep] = useState<StatusStep>('uploading')
  const [transcript, setTranscript] = useState<string | null>(null)
  const [translation, setTranslation] = useState<string | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [paperFormAttested, setPaperFormAttested] = useState(false)
  const [grantingConsent, setGrantingConsent] = useState(false)
  const [consentError, setConsentError] = useState<string | null>(null)

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
    const { lessonId: newLessonId, transcript: tx, error: txErr } = await invokeTranscribe(sessionId)
    if (txErr || !newLessonId) {
      setErrorMsg(`Transcription failed: ${txErr ?? 'no lesson id returned'}`)
      setPhase('error')
      setUploading(false)
      return
    }
    setLessonId(newLessonId)
    setTranscript(tx ?? '')

    // 3. Translate (server-side Claude) — fire and await; cheap enough we don't
    //    background it.
    setStatusStep('translating')
    const { translation: tr, error: trErr } = await invokeTranslate(newLessonId)
    if (trErr) {
      // Transcript still counts as a successful capture; surface as soft error.
      setErrorMsg(`Translation failed, but the transcript was saved: ${trErr}`)
    } else {
      setTranslation(tr ?? '')
    }
    setStatusStep('done')
    setPhase('done')
    setUploading(false)
  }

  async function confirmRecordConsent() {
    if (!teacher || grantingConsent) return
    setGrantingConsent(true)
    setConsentError(null)
    const err = await grantRecordConsentFromPaperForm(teacher.id)
    if (err) {
      setConsentError(err)
      setGrantingConsent(false)
      return
    }
    await refreshTeacher()
    setGrantingConsent(false)
    setPaperFormAttested(false)
    setPhase('needs-consent-clip')
  }

  function startAnother() {
    setSessionId(null)
    setLessonId(null)
    setTranscript(null)
    setTranslation(null)
    setErrorMsg(null)
    setStatusStep('uploading')
    setPhase('needs-consent-clip')
  }

  // ----- Render -----
  if (phase === 'loading' || loadingTeacher) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  const teacherName = teacher?.display_name ?? 'your grandparent'

  if (phase === 'no-record-consent') {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>One thing before recording</CardTitle>
            <CardDescription className="text-base">
              We need to know {teacherName} has signed a paper consent form.
              Print the form, have them sign it, and keep the paper somewhere
              safe. Then tick the box below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild variant="outline" className="w-full sm:w-auto">
              <a href="/consent-form-template.md" target="_blank" rel="noreferrer">
                <FileText /> Open the consent form
              </a>
            </Button>
            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-border p-4">
              <Checkbox
                checked={paperFormAttested}
                disabled={grantingConsent}
                onCheckedChange={(v) => setPaperFormAttested(v === true)}
                className="mt-0.5 size-5"
                id="attest"
              />
              <div className="min-w-0 flex-1">
                <Label htmlFor="attest" className="text-base font-medium">
                  {teacherName} has signed the paper form, and I have it.
                </Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  This saves your confirmation under your account. The form
                  itself isn't uploaded. You can undo this any time in
                  Family settings.
                </p>
              </div>
            </label>
            {consentError && <p className="text-sm text-red-600">{consentError}</p>}
            <Button
              onClick={confirmRecordConsent}
              disabled={!paperFormAttested || grantingConsent}
              size="lg"
              className="w-full"
            >
              {grantingConsent ? 'Saving…' : 'Continue to recording'}
              {!grantingConsent && <ArrowRight />}
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const langName = languageLabel(teacher?.native_language ?? '')

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-3xl font-semibold">Record a lesson</h1>
        <p className="mt-1 text-muted-foreground">
          {teacherName} · {langName}
        </p>
      </header>

      {phase !== 'error' && <Stepper phase={phase} />}

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
            <div className="flex flex-col gap-3 sm:flex-row">
              {lessonId && (
                <Button asChild size="lg" className="flex-1">
                  <Link to={`/lessons/${lessonId}`}>
                    Open the lesson <ArrowRight />
                  </Link>
                </Button>
              )}
              <Button onClick={startAnother} size="lg" variant="outline" className="flex-1">
                <Mic /> Record another
              </Button>
            </div>
          )}
        </>
      )}

      {phase === 'error' && (
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription className="text-base">{errorMsg}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={() => navigate(0)} size="lg">
              Try again
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link to="/library">Back to lessons</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
