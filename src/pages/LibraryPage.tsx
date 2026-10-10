import { Link } from 'react-router-dom'
import { ChevronRight, Mic } from 'lucide-react'
import { LibraryGrid } from '@/components/LibraryGrid'
import { useAuth } from '@/hooks/useAuth'
import { useLessons } from '@/hooks/useLessons'
import { useTeacher } from '@/hooks/useTeacher'
import { languageLabel } from '@/lib/languages'

export function LibraryPage() {
  const { familyId } = useAuth()
  const { lessons, loading, error } = useLessons(familyId)
  const { teacher } = useTeacher(familyId)

  const teacherName = teacher?.display_name
  const count = lessons.length

  return (
    <div className="space-y-6">
      <section>
        <p className="text-sm text-muted-foreground">Lessons from</p>
        <h1 className="text-3xl font-semibold sm:text-4xl">
          {teacherName ?? 'your family'}
        </h1>
        {teacher && (
          <p className="mt-1 text-muted-foreground">
            {languageLabel(teacher.native_language)}
            {!loading && ` · ${count} ${count === 1 ? 'lesson' : 'lessons'}`}
          </p>
        )}
      </section>

      <Link
        to="/record"
        className="group flex items-center gap-4 rounded-2xl bg-accent p-5 text-accent-foreground shadow-md transition hover:shadow-lg active:scale-[0.99]"
      >
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-white/20">
          <Mic className="h-7 w-7" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-heading text-xl font-semibold">Record a new lesson</span>
          <span className="block text-sm opacity-90">
            {teacherName ? `Capture ${teacherName} teaching a word, phrase or story` : 'Capture a word, phrase or story'}
          </span>
        </span>
        <ChevronRight className="h-6 w-6 shrink-0 transition-transform group-hover:translate-x-1" />
      </Link>

      <LibraryGrid lessons={lessons} loading={loading} error={error} />
    </div>
  )
}
