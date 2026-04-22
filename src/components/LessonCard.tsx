import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/card'
import type { Lesson } from '@/lib/types'

const LANGUAGE_NAMES: Record<string, string> = {
  sl: 'Slovene',
  de: 'German',
  fr: 'French',
  uk: 'Ukrainian',
  tl: 'Tagalog',
  es: 'Spanish',
  it: 'Italian',
  hr: 'Croatian',
  sr: 'Serbian',
  pl: 'Polish',
  ru: 'Russian',
  hu: 'Hungarian',
  pt: 'Portuguese',
}

function languageLabel(code: string): string {
  return LANGUAGE_NAMES[code.toLowerCase()] ?? code.toUpperCase()
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text
  return `${text.slice(0, max).trimEnd()}…`
}

interface Props {
  lesson: Lesson
}

export function LessonCard({ lesson }: Props) {
  const hasTranscript = lesson.transcript.trim().length > 0
  const timeAgo = formatDistanceToNow(new Date(lesson.created_at), {
    addSuffix: true,
  })

  return (
    <Link to={`/lessons/${lesson.id}`} className="block group">
      <Card className="h-full p-4 transition border hover:border-primary hover:shadow-sm">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {lesson.title ?? (hasTranscript ? truncate(lesson.transcript, 60) : 'Processing…')}
            </p>
            <p className="text-xs text-muted-foreground">{timeAgo}</p>
          </div>
          <span className="shrink-0 rounded-full border border-border px-2 py-0.5 text-[10px] uppercase tracking-wide text-muted-foreground">
            {languageLabel(lesson.language_code)}
          </span>
        </div>

        {hasTranscript ? (
          <div className="space-y-2 text-sm">
            <p className="line-clamp-2 text-foreground">
              {truncate(lesson.transcript, 200)}
            </p>
            {lesson.translation && (
              <p className="line-clamp-2 italic text-muted-foreground">
                {truncate(lesson.translation, 200)}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Transcription still in progress.
          </p>
        )}
      </Card>
    </Link>
  )
}
