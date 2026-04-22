import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { formatDistanceToNow } from 'date-fns'
import { ArrowLeft, Sparkles, Trash2 } from 'lucide-react'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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

  const [transcriptDraft, setTranscriptDraft] = useState('')
  const [translationDraft, setTranslationDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveMsg, setSaveMsg] = useState<string | null>(null)
  const [fetchingNote, setFetchingNote] = useState(false)

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
      setTranscriptDraft(lesson.transcript)
      setTranslationDraft(lesson.translation ?? '')
      setStatus('ready')
    })
    return () => {
      active = false
    }
  }, [id])

  const dirty =
    lesson != null &&
    (transcriptDraft !== lesson.transcript ||
      translationDraft !== (lesson.translation ?? ''))

  async function saveEdits() {
    if (!lesson || !dirty) return
    setSaving(true)
    setSaveMsg(null)
    const err = await updateLesson(lesson.id, {
      transcript: transcriptDraft,
      translation: translationDraft || null,
    })
    if (err) {
      setSaveMsg(`Save failed: ${err}`)
      setSaving(false)
      return
    }
    setLesson({
      ...lesson,
      transcript: transcriptDraft,
      translation: translationDraft || null,
    })
    setSaveMsg('Saved.')
    setSaving(false)
  }

  async function generateNote() {
    if (!lesson) return
    setFetchingNote(true)
    const { culturalNote, error } = await ensureCulturalNote(lesson.id)
    setFetchingNote(false)
    if (error) {
      setSaveMsg(`Could not generate note: ${error}`)
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
      <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
        Loading…
      </div>
    )
  }

  if (status === 'not-found') {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Lesson not found</CardTitle>
            <CardDescription>
              It may have been deleted, or you might not have access.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link to="/library">Back to library</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (status === 'error' || !lesson) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <Card>
          <CardHeader>
            <CardTitle>Something went wrong</CardTitle>
            <CardDescription>{errorMsg ?? 'Unknown error'}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => navigate(0)}>Try again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="flex items-center justify-between gap-3">
        <Button asChild variant="ghost" size="sm">
          <Link to="/library">
            <ArrowLeft className="mr-2 h-4 w-4" /> Library
          </Link>
        </Button>
        <DeleteConfirm
          trigger={
            <Button variant="destructive" size="sm">
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </Button>
          }
          title="Delete this lesson?"
          description="The transcript and translation disappear from the library. The audio itself is kept encrypted as a compliance record and cannot be played back again. This action is permanent."
          onConfirm={handleDelete}
        />
      </header>

      <section className="space-y-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {formatDistanceToNow(new Date(lesson.created_at), { addSuffix: true })}
          {' · '}
          {lesson.language_code.toUpperCase()}
        </p>
        <h1 className="text-2xl font-semibold">
          {lesson.title ?? 'Untitled lesson'}
        </h1>
      </section>

      <AudioPlayer path={session?.raw_audio_uri ?? null} />

      <section className="space-y-2">
        <Label htmlFor="transcript">Transcript</Label>
        <Textarea
          id="transcript"
          value={transcriptDraft}
          onChange={(e) => setTranscriptDraft(e.target.value)}
          rows={Math.max(3, Math.min(12, transcriptDraft.split('\n').length + 1))}
          className="font-medium"
        />
      </section>

      <section className="space-y-2">
        <Label htmlFor="translation">Translation (English)</Label>
        <Textarea
          id="translation"
          value={translationDraft}
          onChange={(e) => setTranslationDraft(e.target.value)}
          placeholder="Claude's translation will appear here."
          rows={Math.max(3, Math.min(12, (translationDraft.split('\n').length || 1) + 1))}
          className="italic text-muted-foreground"
        />
      </section>

      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <Label>Cultural note</Label>
          {!lesson.cultural_note && (
            <Button
              size="sm"
              variant="outline"
              onClick={generateNote}
              disabled={fetchingNote}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              {fetchingNote ? 'Thinking…' : 'Generate'}
            </Button>
          )}
        </div>
        {lesson.cultural_note ? (
          <p className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            {lesson.cultural_note}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">
            No cultural note yet. Tap <em>Generate</em> to ask Claude for a
            one-line story or context note drawn from the transcript.
          </p>
        )}
      </section>

      <footer className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-sm text-muted-foreground">
          {saveMsg ?? (dirty ? 'Unsaved changes.' : 'Up to date.')}
        </p>
        <Button onClick={saveEdits} disabled={!dirty || saving}>
          {saving ? 'Saving…' : 'Save changes'}
        </Button>
      </footer>
    </div>
  )
}
