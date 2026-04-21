import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2 } from 'lucide-react'

export type StatusStep =
  | 'uploading'
  | 'transcribing'
  | 'translating'
  | 'done'
  | 'error'

interface RecordingStatusProps {
  step: StatusStep
  transcript?: string | null
  translation?: string | null
  errorMsg?: string | null
}

const STEP_LABELS: Record<StatusStep, string> = {
  uploading: 'Uploading the recording…',
  transcribing: 'Transcribing with Whisper…',
  translating: 'Translating with Claude…',
  done: 'Ready',
  error: 'Something went wrong',
}

/**
 * Live status card shown after the user commits a recording. Walks through
 * the pipeline phases with a spinner, then reveals transcript + translation
 * when they arrive.
 */
export function RecordingStatus({
  step,
  transcript,
  translation,
  errorMsg,
}: RecordingStatusProps) {
  const isPending = step === 'uploading' || step === 'transcribing' || step === 'translating'

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {isPending && <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />}
          {STEP_LABELS[step]}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {transcript && (
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Transcript
            </p>
            <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
              {transcript}
            </p>
          </section>
        )}

        {translation && (
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              English translation
            </p>
            <p className="rounded-md bg-muted/40 p-3 text-sm leading-relaxed">
              {translation}
            </p>
          </section>
        )}

        {step === 'translating' && !translation && (
          <p className="text-xs text-muted-foreground">
            Translation is still arriving — should take a few seconds.
          </p>
        )}

        {step === 'error' && errorMsg && (
          <p className="text-sm text-red-600">{errorMsg}</p>
        )}
      </CardContent>
    </Card>
  )
}
