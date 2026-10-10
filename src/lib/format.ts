import type { Lesson } from '@/lib/types'

export function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

/** Titles are optional, so fall back to the opening words of the transcript. */
export function lessonTitle(lesson: Lesson): string {
  if (lesson.title?.trim()) return lesson.title
  const transcript = lesson.transcript.trim()
  if (!transcript) return 'Processing…'
  return truncate(transcript, 60)
}

/** 75 → "1:15" */
export function formatSeconds(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}
