import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, Square } from 'lucide-react'
import { formatSeconds } from '@/lib/format'

interface RecordButtonProps {
  /** Called when the user taps to start. */
  onStart: () => void | Promise<void>
  /** Called when the user taps again to stop (or maxSeconds is reached). */
  onStop: () => void | Promise<void>
  /** Render a disabled button — used while uploading / transcribing. */
  disabled?: boolean
  /** True while recording — driven by parent state, not internal. */
  isRecording: boolean
  /** 0..1 live mic level from useRecording — drives the pulsing ring. */
  level?: number
  /** Ignored if undefined; otherwise auto-stops when elapsed seconds reach this. */
  maxSeconds?: number
}

/**
 * Big round tap-to-toggle capture button. Tap once to start, tap again to
 * stop — no holding, so a grandparent can tell a five-minute story without
 * someone keeping a finger on the screen. Pulses with the live input level
 * and shows a running timer.
 */
export function RecordButton({
  onStart,
  onStop,
  disabled,
  isRecording,
  level = 0,
  maxSeconds,
}: RecordButtonProps) {
  const [busy, setBusy] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const onStopRef = useRef(onStop)

  useEffect(() => {
    onStopRef.current = onStop
  })

  useEffect(() => {
    if (!isRecording) return
    const startedAt = Date.now()
    let stopped = false
    const id = window.setInterval(() => {
      const sec = Math.floor((Date.now() - startedAt) / 1000)
      setElapsed(sec)
      if (maxSeconds && sec >= maxSeconds && !stopped) {
        stopped = true
        void onStopRef.current()
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [isRecording, maxSeconds])

  async function handleClick() {
    if (disabled || busy) return
    setBusy(true)
    try {
      if (isRecording) {
        await onStop()
      } else {
        setElapsed(0)
        await onStart()
      }
    } finally {
      setBusy(false)
    }
  }

  // Scale the outer pulsing ring with the live input level; feels alive.
  const ringScale = isRecording ? 1.08 + level * 0.4 : 1
  const shownElapsed = isRecording ? elapsed : 0

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        disabled={disabled || (busy && !isRecording)}
        onClick={handleClick}
        className={
          'relative flex h-36 w-36 select-none items-center justify-center rounded-full transition-all duration-150 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/40 ' +
          (disabled
            ? 'cursor-not-allowed bg-muted text-muted-foreground'
            : isRecording
              ? 'bg-red-600 text-white shadow-xl'
              : 'bg-accent text-accent-foreground shadow-lg hover:scale-105 active:scale-95')
        }
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {isRecording && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-red-500/30"
            style={{ transform: `scale(${ringScale})`, transition: 'transform 75ms ease-out' }}
          />
        )}
        <span className="relative">
          {busy && !isRecording ? (
            <Loader2 className="h-12 w-12 animate-spin" />
          ) : isRecording ? (
            <Square className="h-11 w-11" fill="white" />
          ) : (
            <Mic className="h-12 w-12" />
          )}
        </span>
      </button>

      {isRecording ? (
        <div className="text-center">
          <p className="font-mono text-2xl font-semibold tabular-nums text-red-600">
            {formatSeconds(shownElapsed)}
            {maxSeconds ? (
              <span className="text-base font-normal text-muted-foreground">
                {' '}/ {formatSeconds(maxSeconds)}
              </span>
            ) : null}
          </p>
          <p className="text-sm text-muted-foreground">Tap the button again when finished</p>
        </div>
      ) : (
        <p className="text-base font-medium text-muted-foreground">Tap to start recording</p>
      )}
    </div>
  )
}
