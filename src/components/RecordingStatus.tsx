import { Check, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

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

const PIPELINE: { key: StatusStep; label: string }[] = [
  { key: 'uploading', label: 'Saving the recording' },
  { key: 'transcribing', label: 'Writing down what was said' },
  { key: 'translating', label: 'Translating to English' },
]

/**
 * Live status card shown after the user commits a recording. Walks through
 * the pipeline phases as a checklist, then reveals transcript + translation
 * when they arrive.
 */
export function RecordingStatus({
  step,
  transcript,
  translation,
  errorMsg,
}: RecordingStatusProps) {
  const currentIndex =
    step === 'done' ? PIPELINE.length : PIPELINE.findIndex((p) => p.key === step)

  return (
    <Card>
      <CardHeader>
        <CardTitle>{step === 'done' ? 'Lesson saved' : 'Working on it…'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <ol className="space-y-3">
          {PIPELINE.map((p, i) => {
            const done = i < currentIndex
            const active = i === currentIndex
            return (
              <li key={p.key} className="flex items-center gap-3">
                <span
                  className={cn(
                    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                    done && 'border-green-600 bg-green-600 text-white',
                    active && 'border-accent text-accent',
                    !done && !active && 'border-border text-muted-foreground'
                  )}
                >
                  {done ? (
                    <Check className="h-4 w-4" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <span className="text-xs">{i + 1}</span>
                  )}
                </span>
                <span className={cn('text-sm', !done && !active && 'text-muted-foreground')}>
                  {p.label}
                </span>
              </li>
            )
          })}
        </ol>

        {transcript && (
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              What they said
            </p>
            <p className="rounded-xl bg-muted/60 p-4 text-lg leading-relaxed">{transcript}</p>
          </section>
        )}

        {translation && (
          <section className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              In English
            </p>
            <p className="rounded-xl bg-muted/60 p-4 leading-relaxed text-muted-foreground italic">
              {translation}
            </p>
          </section>
        )}

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
      </CardContent>
    </Card>
  )
}
