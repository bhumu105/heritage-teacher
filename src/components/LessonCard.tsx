import { Link } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ChevronRight, Sparkles } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { lessonTitle, truncate } from '@/lib/format'
import { languageLabel } from '@/lib/languages'
import type { Lesson } from '@/lib/types'

interface Props {
  lesson: Lesson
}

export function LessonCard({ lesson }: Props) {
  const hasTranscript = lesson.transcript.trim().length > 0
  const timeAgo = formatDistanceToNow(new Date(lesson.created_at), {
    addSuffix: true,
  })

  return (
    <Link to={`/lessons/${lesson.id}`} className="group block">
      <Card className="flex h-full flex-col p-5 transition hover:-translate-y-0.5 hover:border-accent/60 hover:shadow-md">
        <div className="mb-3 flex items-start justify-between gap-3">
          <p className="min-w-0 flex-1 font-heading text-lg font-semibold leading-snug line-clamp-2">
            {lessonTitle(lesson)}
          </p>
          <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </div>

        {hasTranscript ? (
          <div className="flex-1 space-y-1.5">
            {lesson.title && (
              <p className="line-clamp-2">{truncate(lesson.transcript, 200)}</p>
            )}
            {lesson.translation && (
              <p className="line-clamp-2 text-sm italic text-muted-foreground">
                {truncate(lesson.translation, 200)}
              </p>
            )}
          </div>
        ) : (
          <p className="flex-1 text-sm text-muted-foreground">Transcription still in progress.</p>
        )}

        <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-1 font-medium">
            {languageLabel(lesson.language_code)}
          </span>
          {lesson.cultural_note && (
            <span className="flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 font-medium text-accent">
              <Sparkles className="h-3 w-3" /> Story note
            </span>
          )}
          <span className="ml-auto">{timeAgo}</span>
        </div>
      </Card>
    </Link>
  )
}
