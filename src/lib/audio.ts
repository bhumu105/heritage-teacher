// MediaRecorder + WebAudio helpers. iOS Safari prefers 'audio/mp4'; desktop
// and Android Chrome prefer 'audio/webm;codecs=opus'. Pick the first supported.

const PREFERRED_MIME_TYPES = [
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/mp4',
  'audio/ogg;codecs=opus',
]

export function pickMimeType(): string {
  if (typeof MediaRecorder === 'undefined') {
    throw new Error('MediaRecorder is not available in this browser')
  }
  const supported = PREFERRED_MIME_TYPES.find((t) =>
    MediaRecorder.isTypeSupported(t)
  )
  if (!supported) {
    throw new Error('No supported audio MIME type in this browser')
  }
  return supported
}

export function fileExtensionFor(mimeType: string): string {
  if (mimeType.startsWith('audio/webm')) return 'webm'
  if (mimeType.startsWith('audio/mp4')) return 'm4a'
  if (mimeType.startsWith('audio/ogg')) return 'ogg'
  return 'bin'
}

export async function requestMicrophone(): Promise<MediaStream> {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('getUserMedia not available')
  }
  return navigator.mediaDevices.getUserMedia({
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
  })
}

export function stopStream(stream: MediaStream) {
  stream.getTracks().forEach((t) => t.stop())
}

/**
 * Attach an RMS-level meter to a live MediaStream. Returns a disposer that
 * stops the rAF loop + tears down the AudioContext. The callback fires at
 * animation-frame rate with a normalised 0..1 level (visual purposes only,
 * not calibrated).
 */
export function createLevelMeter(
  stream: MediaStream,
  onLevel: (level: number) => void
): () => void {
  const AudioCtx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!AudioCtx) {
    // Gracefully no-op on ancient browsers — recording still works, meter just stays flat.
    return () => {}
  }
  const ctx = new AudioCtx()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.6
  source.connect(analyser)

  const buffer = new Uint8Array(analyser.fftSize)
  let raf = 0
  let stopped = false

  const tick = () => {
    if (stopped) return
    analyser.getByteTimeDomainData(buffer)
    // Compute RMS of the waveform around the 128 midpoint.
    let sumSquares = 0
    for (let i = 0; i < buffer.length; i++) {
      const v = (buffer[i] - 128) / 128
      sumSquares += v * v
    }
    const rms = Math.sqrt(sumSquares / buffer.length)
    // Visual polish: compress the dynamic range so quiet-room noise doesn't
    // look identical to actually-speaking volume.
    const level = Math.min(1, rms * 2.2)
    onLevel(level)
    raf = requestAnimationFrame(tick)
  }
  raf = requestAnimationFrame(tick)

  return () => {
    stopped = true
    cancelAnimationFrame(raf)
    source.disconnect()
    analyser.disconnect()
    void ctx.close()
  }
}
