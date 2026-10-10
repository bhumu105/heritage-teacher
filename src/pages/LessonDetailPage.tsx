import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Loader2, Pencil, Sparkles, Trash2 } from 'lucide-react'
import { AudioPlayer } from '@/components/AudioPlayer'
import { DeleteConfirm } from '@/components/DeleteConfirm'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { lessonTitle } from '@/lib/format'
import { languageLabel } from '@/lib/languages'
import {
  ensureCulturalNote,
  fetchLessonWithSession,
  softDeleteLesson,
  updateLesson,
} from '@/lib/lessons'
import type { Lesson, RecordingSession } from '@/lib/types'

type Status = 'loading' | 'ready' | 'not-found' | 'error'

export function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const [status, setStatus] = useState<Status>('loading')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [lesson, setLesson] = useState<Lesson | null>(null)
  const [session, setSession] = useState<RecordingSession | null>(null)

  const [editing, setEditing] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [translationDraft, setTranslationDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [fetchingNote, setFetchingNote] = useState(false)
  const [noteError, setNoteError] = useState<string | null>(null)

  // Initial load.
  useEffect(() => {
    let active = true
    if (!id) {
      setStatus('not-found')
      return
    }
    setStatus('loading')
    fetchLessonWithSession(id).then(({ lesson, session, error }) => {
      if (!active) return
      if (error) {
        setErrorMsg(error)
        setStatus('error')
        return
      }
      if (!lesson) {
        setStatus('not-found')
        return
      }
      setLesson(lesson)
      setSession(session)
      setStatus('ready')
    })
    return () => {
      active = false
    }
  }, [id])

  const dirty =
    lesson != null &&
    (titleDraft.trim() !== (lesson.title ?? '') ||
      transcriptDraft !== lesson.transcript ||
      translationDraft !== (lesson.translation ?? ''))

  function startEditing() {
    if (!lesson) return
    setTitleDraft(lesson.title ?? '')
    setTranscriptDraft(lesson.transcript)
    setTranslationDraft(lesson.translation ?? '')
    setSaveMsg(null)
    setEditing(true)
  }

  async function saveEdits() {
    if (!lesson) return
    if (!dirty) {
      setEditing(false)
      return
    }
    setSaving(true)
    setSaveMsg(null)
    const patch = {
      title: titleDraft.trim() || null,
      transcript: transcriptDraft,
      translation: translationDraft || null,
    }
    const err = await updateLesson(lesson.id, patch)
    if (err) {
      setSaveMsg(`Save failed: ${err}`)
      setSaving(false)
      return
    }
    setLesson({ ...lesson, ...patch })
    setSaving(false)
    setEditing(false)
  }

  async function generateNote() {
    if (!lesson) return
    setFetchingNote(true)
    setNoteError(null)
    const { culturalNote, error } = await ensureCulturalNote(lesson.id)
    setFetchingNote(false)
    if (error) {
      setNoteError(`Could not write a note: ${error}`)
      return
    }
    setLesson({ ...lesson, cultural_note: culturalNote })
  }

  async function handleDelete(): Promise<string | null> {
    if (!lesson) return 'No lesson'
    const err = await softDeleteLesson(lesson.id)
    if (err) return err
    navigate('/library', { replace: true })
    return null
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" /> Loading…
      </div>
    )
  }

  if (status === 'not-found' || status === 'error' || !lesson) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>
              {status === 'not-found' ? 'Lesson not found' : 'Something went wrong'}
            </CardTitle>
            <CardDescription className="text-base">
              {status === 'not-found'
                ? 'It may have been deleted, or you might not have access.'
                : errorMsg ?? 'Unknown error'}
            </CardDescription>
          </CardHeader>
          <CardContent className="flex gap-3">
            {status === 'error' && <Button onClick={() => navigate(0)}>Try again</Button>}
            <Button asChild variant="outline">
              <Link to="/library">Back to lessons</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" className="-ml-3">
          <Link to="/library">
            <ArrowLeft /> All lessons
          </Link>
        </Button>
        {!editing && (
          <Button variant="outline" onClick={startEditing}>
            <Pencil /> Edit
          </Button>
        )}
      </div>

      <header className="space-y-2">
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span className="rounded-full bg-muted px-2.5 py-0.5 font-medium">
            {languageLabel(lesson.language_code)}
          </span>
          <span>{format(new Date(lesson.created_at), 'MMMM d, yyyy')}</span>
        </div>
        {editing ? (
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={titleDraft}
              onChange={(e) => setTitleDraft(e.target.value)}
              placeholder="e.g. Saying good morning"
              className="h-12 text-lg"
            />
          </div>
        ) : (
          <h1 className="text-3xl font-semibold leading-tight sm:text-4xl">
            {lessonTitle(lesson)}
          </h1>
        )}
      </header>

      <Card className="p-4">
        <AudioPlayer path={session?.raw_audio_uri ?? null} />
      </Card>

      {editing ? (
        <>
          <section className="space-y-2">
            <Label htmlFor="transcript">What they said</Label>
            <Textarea
              id="transcript"
              value={transcriptDraft}
              onChange={(e) => setTranscriptDraft(e.target.value)}
              rows={Math.max(4, Math.min(14, transcriptDraft.split('\n').length + 2))}
              className="text-base"
            />
          </section>
          <section className="space-y-2">
            <Label htmlFor="translation">In English</Label>
            <Textarea
              id="translation"
              value={translationDraft}
              onChange={(e) => setTranslationDraft(e.target.value)}
              placeholder="Claude's translation will appear here."
              rows={Math.max(4, Math.min(14, translationDraft.split('\n').length + 2))}
              className="text-base"
            />
          </section>

          <div className="sticky bottom-24 z-10 flex items-center justify-between gap-3 rounded-2xl border border-border bg-card p-3 shadow-lg sm:bottom-4">
            <p className="pl-2 text-sm text-muted-foreground">
              {saveMsg ?? (dirty ? 'Unsaved changes' : 'No changes yet')}
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setEditing(false)} disabled={saving}>
                Cancel
              </Button>
              <Button onClick={saveEdits} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          </div>
        </>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground font-sans">
              What they said
            </h2>
            <p className="whitespace-pre-wrap text-xl leading-relaxed">
              {lesson.transcript || 'Transcription still in progress.'}
            </p>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground font-sans">
              In English
            </h2>
            <p className="whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground italic">
              {lesson.translation || 'No translation yet.'}
            </p>
          </section>
        </>
      )}

      <section className="rounded-2xl border border-accent/25 bg-accent/5 p-5">
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <Sparkles className="h-5 w-5 text-accent" /> Story & context
          </h2>
          {!lesson.cultural_note && (
            <Button size="sm" variant="outline" onClick={generateNote} disabled={fetchingNote}>
              {fetchingNote ? 'Thinking…' : 'Write one'}
            </Button>
          )}
        </div>
        {lesson.cultural_note ? (
          <p className="leading-relaxed">{lesson.cultural_note}</p>
        ) : (
          <p className="text-sm text-muted-foreground">
            Claude can add a short note about the culture or history behind
            this lesson.
          </p>
        )}
        {noteError && <p className="mt-2 text-sm text-red-600">{noteError}</p>}
      </section>

      {!editing && (
        <div className="border-t border-border pt-6">
          <DeleteConfirm
            trigger={
              <Button variant="ghost" className="-ml-3 text-red-600 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-950">
                <Trash2 /> Delete this lesson
              </Button>
            }
            title="Delete this lesson?"
            description="The transcript and translation disappear from the library. The audio itself is kept encrypted as a compliance record and cannot be played back again. This action is permanent."
            onConfirm={handleDelete}
          />
        </div>
      )}
    </div>
  )
}
