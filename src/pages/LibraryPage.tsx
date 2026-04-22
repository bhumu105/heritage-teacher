import { Link } from 'react-router-dom'
import { Mic, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { LibraryGrid } from '@/components/LibraryGrid'
import { useAuth } from '@/hooks/useAuth'
import { useLessons } from '@/hooks/useLessons'

export function LibraryPage() {
  const { familyId } = useAuth()
  const { lessons, loading, error } = useLessons(familyId)

  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold">Heritage Teacher</h1>
          <p className="text-sm text-muted-foreground">
            Your family's recorded lessons.
          </p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button asChild>
            <Link to="/record">
              <Mic className="mr-2 h-4 w-4" /> Record
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link to="/settings" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <LibraryGrid lessons={lessons} loading={loading} error={error} />
    </div>
  )
}
