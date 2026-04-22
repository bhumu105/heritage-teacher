import { useMemo, useState } from 'react'
import { Input } from '@/components/ui/input'
import { LessonCard } from '@/components/LessonCard'
import type { Lesson } from '@/lib/types'

interface Props {
  lessons: Lesson[]
  loading: boolean
  error: string | null
}

/**
 * Client-side search across transcript + translation + title. For v0 corpora
 * (< 500 lessons per family) this is instant; no server-side full-text needed.
 */
function matches(lesson: Lesson, needle: string): boolean {
  if (!needle) return true
  const hay = [
    lesson.transcript,
    lesson.translation ?? '',
    lesson.title ?? '',
  ]
    .join(' ')
    .toLowerCase()
  return hay.includes(needle.toLowerCase())
}

export function LibraryGrid({ lessons, loading, error }: Props) {
  const [query, setQuery] = useState('')

  const filtered = useMemo(
    () => lessons.filter((l) => matches(l, query.trim())),
    [lessons, query]
  )

  if (error) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Could not load lessons: {error}
      </div>
    )
  }

  if (loading && lessons.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        Loading lessons…
      </p>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border p-8 text-center">
        <p className="text-sm font-medium">No lessons yet</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Tap <span className="font-medium">Record</span> to capture your first
          one. It'll appear here as soon as the transcript is ready.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Input
        placeholder="Search lessons…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search lessons"
      />

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No lessons match "{query}".
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {filtered.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      )}
    </div>
  )
}
