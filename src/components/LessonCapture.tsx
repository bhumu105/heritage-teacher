import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { LevelMeter } from '@/components/LevelMeter'
import { RecordButton } from '@/components/RecordButton'
import { useRecording, type RecordingResult } from '@/hooks/useRecording'

interface LessonCaptureProps {
  teacherName: string
  /** Fires when the user commits the recording (clicks "Keep it"). */
  onCommit: (result: RecordingResult) => void | Promise<void>
  /** Disable the whole UI while the parent is uploading. */
  uploading?: boolean
}

/**
 * Step 2 of the capture flow: record an arbitrary-length lesson. After the
 * user releases the button, play back a preview so they can decide to keep
 * or redo before we eat any Whisper credits.
 */
export function LessonCapture({
  teacherName,
  onCommit,
  uploading,
}: LessonCaptureProps) {
  const { state, error, level, start, stop, reset } = useRecording()
  const [preview, setPreview] = useState<RecordingResult | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [elapsedLabel, setElapsedLabel] = useState('')

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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2 of 2 — Teach a phrase</CardTitle>
        <CardDescription>
          Press and hold. {teacherName} can teach one word, a greeting, or tell
          a short story. Release when they're done.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {preview ? (
          <div className="space-y-4">
            <p className="text-sm">
              Captured {preview.durationSeconds}s — listen back, then keep it or redo.
            </p>
            {previewUrl && (
              <audio src={previewUrl} controls className="w-full" />
            )}
            <div className="flex gap-3">
              <Button
                onClick={handleKeep}
                className="flex-1"
                disabled={uploading}
              >
                {uploading ? 'Uploading…' : 'Keep it'}
              </Button>
              <Button
                onClick={handleRedo}
                variant="outline"
                className="flex-1"
                disabled={uploading}
              >
                Redo
              </Button>
            </div>
          </div>
        ) : (
          <>
            <LevelMeter level={level} active={state === 'recording'} />
            <div className="flex flex-col items-center gap-2">
              <RecordButton
                onStart={start}
                onStop={handleStop}
                isRecording={state === 'recording'}
                level={level}
                elapsedLabel={elapsedLabel}
              />
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
          </>
        )}
      </CardContent>
    </Card>
  )
}
