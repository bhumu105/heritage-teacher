import { useMemo, useState } from 'react'
import { Loader2, Search, X } from 'lucide-react'
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
    lesson.cultural_note ?? '',
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
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
        Could not load lessons: {error}
      </div>
    )
  }

  if (loading && lessons.length === 0) {
    return (
      <p className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading lessons…
      </p>
    )
  }

  if (lessons.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="font-heading text-xl font-semibold">No lessons yet</p>
        <p className="mx-auto mt-2 max-w-sm text-muted-foreground">
          Your first recording will show up here with a written transcript and
          an English translation.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl font-semibold">All lessons</h2>
        {query && (
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {lessons.length}
          </p>
        )}
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search words, phrases or translations…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search lessons"
          className="h-12 rounded-xl bg-card pl-10 pr-10 text-base"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            className="absolute right-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
            aria-label="Clear search"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Nothing matches “{query}”.
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
