import { useState } from 'react'
import { format } from 'date-fns'
import { Loader2 } from 'lucide-react'
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
  const [submitting, setSubmitting] = useState(false)
  const today = format(new Date(), 'MMMM d, yyyy')

  const script = `Today is ${today}. I am ${teacherName}, and I agree to have my voice recorded while I teach ${languageName} to my family.`

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
        <CardTitle>First, {teacherName} says yes</CardTitle>
        <CardDescription className="text-base">
          Tap the button, have {teacherName} read this line out loud, then tap
          again. The clip is kept with the recording as their spoken permission.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <blockquote className="rounded-xl border-l-4 border-accent bg-muted/60 p-5 font-heading text-xl leading-relaxed sm:text-2xl">
          “{script}”
        </blockquote>

        <LevelMeter level={level} active={state === 'recording'} />

        {submitting ? (
          <p className="flex items-center justify-center gap-2 py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" /> Saving their permission…
          </p>
        ) : (
          <RecordButton
            onStart={start}
            onStop={handleStop}
            isRecording={state === 'recording'}
            level={level}
            maxSeconds={30}
          />
        )}

        {error && <p className="text-center text-sm text-red-600">{error}</p>}
      </CardContent>
    </Card>
  )
}
