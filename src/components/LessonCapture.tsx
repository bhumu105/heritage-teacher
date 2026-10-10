import { useEffect, useState } from 'react'
import { Check, RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LevelMeter } from '@/components/LevelMeter'
import { RecordButton } from '@/components/RecordButton'
import { useRecording, type RecordingResult } from '@/hooks/useRecording'
import { formatSeconds } from '@/lib/format'

interface LessonCaptureProps {
  teacherName: string
  /** Fires when the user commits the recording (clicks "Save lesson"). */
  onCommit: (result: RecordingResult) => void | Promise<void>
  /** Disable the whole UI while the parent is uploading. */
  uploading?: boolean
}

const IDEAS = [
  'How to say hello, thank you, and goodbye',
  'A favourite family recipe',
  'A song or rhyme from childhood',
  'A story about where they grew up',
]

/**
 * Step 2 of the capture flow: record an arbitrary-length lesson. After the
 * user stops, play back a preview so they can decide to keep or redo before
 * we eat any Whisper credits.
 */
export function LessonCapture({
  teacherName,
  onCommit,
  uploading,
}: LessonCaptureProps) {
  const { state, error, level, start, stop, reset } = useRecording()
  const [preview, setPreview] = useState<RecordingResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
  }, [previewUrl])

  async function handleStop() {
    if (state !== 'recording') return
    const result = await stop()
    const url = URL.createObjectURL(result.blob)
    setPreview(result)
    setPreviewUrl(url)
  }

  function handleRedo() {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setPreview(null)
    setPreviewUrl(null)
    reset()
  }

  async function handleKeep() {
    if (!preview) return
    await onCommit(preview)
    // Leave preview visible while parent uploads/transcribes.
  }

  if (preview) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Listen back</CardTitle>
          <CardDescription className="text-base">
            You recorded {formatSeconds(preview.durationSeconds)}. Happy with it?
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          {previewUrl && <audio src={previewUrl} controls className="w-full" />}
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button onClick={handleKeep} size="lg" className="flex-1" disabled={uploading}>
              <Check /> {uploading ? 'Saving…' : 'Save lesson'}
            </Button>
            <Button
              onClick={handleRedo}
              variant="outline"
              size="lg"
              className="flex-1"
              disabled={uploading}
            >
              <RotateCcw /> Record again
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Now, the lesson</CardTitle>
        <CardDescription className="text-base">
          Tap to start. {teacherName} can teach a single word or tell a long
          story. There's no time limit, so tap again when they're done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <LevelMeter level={level} active={state === 'recording'} />
        <RecordButton
          onStart={start}
          onStop={handleStop}
          isRecording={state === 'recording'}
          level={level}
        />
        {error && <p className="text-center text-sm text-red-600">{error}</p>}

        {state !== 'recording' && (
          <div className="rounded-xl bg-muted/60 p-4">
            <p className="mb-2 text-sm font-medium">Not sure what to record? Try:</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {IDEAS.map((idea) => (
                <li key={idea}>• {idea}</li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
