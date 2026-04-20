// MediaRecorder helpers. iOS Safari prefers 'audio/mp4'; desktop + Android
// Chrome prefer 'audio/webm;codecs=opus'. We pick the first supported.

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
