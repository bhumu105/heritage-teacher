import { useEffect, useState } from 'react'
import { createSignedAudioUrl } from '@/lib/lessons'

interface Props {
  /** Private-bucket storage path, e.g. `<family_id>/<session_id>/audio.webm`. */
  path: string | null
  className?: string
}

/**
 * Resolves a signed URL for a private Storage object and renders an
 * HTML5 audio element. Handles the "still loading" and "never had a path"
 * states so callers can use it unconditionally.
 */
export function AudioPlayer({ path, className }: Props) {
  const [url, setUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!path) {
      setUrl(null)
      return
    }
    setError(null)
    createSignedAudioUrl(path).then(({ url, error }) => {
      if (!active) return
      if (error) setError(error)
      setUrl(url)
    })
    return () => {
      active = false
    }
  }, [path])

  if (!path) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ''}`}>
        No audio attached to this lesson.
      </p>
    )
  }
  if (error) {
    return (
      <p className={`text-xs text-red-600 ${className ?? ''}`}>
        Could not load audio: {error}
      </p>
    )
  }
  if (!url) {
    return (
      <p className={`text-xs text-muted-foreground ${className ?? ''}`}>
        Loading audio…
      </p>
    )
  }

  return (
    <audio
      src={url}
      controls
      preload="metadata"
      className={`w-full ${className ?? ''}`}
    >
      Your browser does not support audio playback.
    </audio>
  )
}
