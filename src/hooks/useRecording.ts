import { useCallback, useRef, useState } from 'react'
import { fileExtensionFor, pickMimeType, requestMicrophone, stopStream } from '@/lib/audio'

export type RecordingState = 'idle' | 'recording' | 'stopped' | 'error'

export interface RecordingResult {
  blob: Blob
  mimeType: string
  extension: string
  durationSeconds: number
}

export function useRecording() {
  const [state, setState] = useState<RecordingState>('idle')
  const [error, setError] = useState<string | null>(null)
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number>(0)
  const resolveRef = useRef<((r: RecordingResult) => void) | null>(null)

  const start = useCallback(async () => {
    try {
      setError(null)
      const stream = await requestMicrophone()
      const mimeType = pickMimeType()
      const rec = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const durationSeconds = Math.max(
          1,
          Math.round((Date.now() - startedAtRef.current) / 1000)
        )
        stopStream(stream)
        streamRef.current = null
        recorderRef.current = null
        setState('stopped')
        resolveRef.current?.({
          blob,
          mimeType,
          extension: fileExtensionFor(mimeType),
          durationSeconds,
        })
        resolveRef.current = null
      }
      streamRef.current = stream
      recorderRef.current = rec
      startedAtRef.current = Date.now()
      rec.start()
      setState('recording')
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e)
      setError(message)
      setState('error')
    }
  }, [])

  const stop = useCallback(() => {
    return new Promise<RecordingResult>((resolve) => {
      resolveRef.current = resolve
      recorderRef.current?.stop()
    })
  }, [])

  return { state, error, start, stop }
}
