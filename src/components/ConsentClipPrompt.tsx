import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LevelMeter } from '@/components/LevelMeter'
import { RecordButton } from '@/components/RecordButton'
import { useRecording, type RecordingResult } from '@/hooks/useRecording'

interface ConsentClipPromptProps {
  teacherName: string
  languageName: string
  /** Fires once the teacher has finished saying the consent line. */
  onCaptured: (result: RecordingResult) => void | Promise<void>
}

/**
 * The verbal-consent gate that must precede every recording session. A
 * scripted line appears on screen — the teacher reads it, the capture is
 * stored alongside the session as the audible compliance artifact.
 *
 * Max 30 seconds; auto-stops past that to prevent rambling captures.
 */
export function ConsentClipPrompt({
  teacherName,
  languageName,
  onCaptured,
}: ConsentClipPromptProps) {
  const { state, error, level, start, stop } = useRecording()
  const [elapsedLabel, setElapsedLabel] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const today = format(new Date(), 'MMMM d, yyyy')

  const script = `Today is ${today}. I am ${teacherName}, and I agree to have my voice recorded while I teach ${languageName} to my family.`

  useEffect(() => {
    if (state !== 'recording') {
      setElapsedLabel('')
      return
    }
    const startedAt = Date.now()
    const id = window.setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000)
      setElapsedLabel(`${sec}s`)
    }, 250)
    return () => window.clearInterval(id)
  }, [state])

  async function handleStop() {
    if (state !== 'recording' || submitting) return
    setSubmitting(true)
    const result = await stop()
    await onCaptured(result)
    setSubmitting(false)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1 of 2 — Verbal consent</CardTitle>
        <CardDescription>
          Before we record anything else, please have {teacherName} read the
          line below into the microphone. This short clip is stored with the
          recording as their permission, and we can delete it any time.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <blockquote className="rounded-md border-l-4 border-primary bg-muted/50 p-4 text-sm leading-relaxed">
          "{script}"
        </blockquote>

        <LevelMeter level={level} active={state === 'recording'} />

        <div className="flex flex-col items-center gap-2">
          <RecordButton
            onStart={start}
            onStop={handleStop}
            isRecording={state === 'recording'}
            level={level}
            disabled={submitting}
            maxSeconds={30}
            elapsedLabel={elapsedLabel}
          />
          {state === 'idle' && (
            <p className="text-xs text-muted-foreground">
              Press and hold, have them read the line, then release.
            </p>
          )}
          {submitting && (
            <p className="text-xs text-muted-foreground">Uploading consent clip…</p>
          )}
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
