import { useEffect, useRef, useState } from 'react'
import { Mic, Square } from 'lucide-react'

interface RecordButtonProps {
  /** Called after the user presses (and passes the initial press threshold). */
  onStart: () => void | Promise<void>
  /** Called after the user releases. */
  onStop: () => void | Promise<void>
  /** Render a disabled button — used while uploading / transcribing. */
  disabled?: boolean
  /** True while recording — driven by parent state, not internal. */
  isRecording: boolean
  /** 0..1 live mic level from useRecording — drives the pulsing ring. */
  level?: number
  /** Ignored if undefined; otherwise auto-stops when elapsed seconds exceed this. */
  maxSeconds?: number
  /** Live counter label, e.g. "12s" while recording. */
  elapsedLabel?: string
}

/**
 * Big round press-and-hold capture button. Holding = recording; release =
 * stop. A 200ms press threshold guards against accidental taps. Pulses
 * gently with the live input level.
 */
export function RecordButton({
  onStart,
  onStop,
  disabled,
  isRecording,
  level = 0,
  maxSeconds,
  elapsedLabel,
}: RecordButtonProps) {
  const [holding, setHolding] = useState(false)
  const pressTimerRef = useRef<number | null>(null)
  const startedAtRef = useRef<number>(0)
  const maxTimerRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (pressTimerRef.current) window.clearTimeout(pressTimerRef.current)
      if (maxTimerRef.current) window.clearTimeout(maxTimerRef.current)
    }
  }, [])

  function handlePressStart(e: React.PointerEvent<HTMLButtonElement>) {
    if (disabled || isRecording) return
    e.currentTarget.setPointerCapture(e.pointerId)
    setHolding(true)
    startedAtRef.current = Date.now()
    pressTimerRef.current = window.setTimeout(() => {
      void onStart()
      if (maxSeconds) {
        maxTimerRef.current = window.setTimeout(() => {
          void onStop()
          setHolding(false)
        }, maxSeconds * 1000)
      }
    }, 200)
  }

  function handlePressEnd() {
    if (pressTimerRef.current) {
      window.clearTimeout(pressTimerRef.current)
      pressTimerRef.current = null
    }
    if (maxTimerRef.current) {
      window.clearTimeout(maxTimerRef.current)
      maxTimerRef.current = null
    }
    if (isRecording) {
      void onStop()
    }
    setHolding(false)
  }

  // Scale the outer pulsing ring with the live input level; feels alive.
  const ringScale = isRecording ? 1 + level * 0.35 : 1

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        disabled={disabled}
        onPointerDown={handlePressStart}
        onPointerUp={handlePressEnd}
        onPointerCancel={handlePressEnd}
        onPointerLeave={(e) => {
          // If the finger/cursor slips off while holding, treat as release
          // so we never leave a dangling "still recording" state.
          if (holding) handlePressEnd()
          // Release pointer capture on leave to avoid ghost events.
          if (e.currentTarget.hasPointerCapture(e.pointerId)) {
            e.currentTarget.releasePointerCapture(e.pointerId)
          }
        }}
        className={
          'relative flex h-32 w-32 select-none items-center justify-center rounded-full transition-all duration-100 ' +
          (disabled
            ? 'cursor-not-allowed bg-muted text-muted-foreground'
            : isRecording
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-primary text-primary-foreground hover:scale-105 active:scale-95')
        }
        aria-label={isRecording ? 'Release to stop' : 'Press and hold to record'}
      >
        {/* Pulsing outer ring when recording */}
        {isRecording && (
          <span
            aria-hidden
            className="absolute inset-0 rounded-full bg-red-500/40"
            style={{ transform: `scale(${ringScale})`, transition: 'transform 75ms ease-out' }}
          />
        )}
        <span className="relative">
          {isRecording ? <Square className="h-10 w-10" fill="white" /> : <Mic className="h-10 w-10" />}
        </span>
      </button>
      <p className="text-sm text-muted-foreground">
        {isRecording
          ? elapsedLabel
            ? `Recording — ${elapsedLabel}. Release to stop.`
            : 'Recording — release to stop.'
          : 'Press and hold to record'}
      </p>
    </div>
  )
}
