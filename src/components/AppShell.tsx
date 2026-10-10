import { useEffect, useState } from 'react'
import { Link, Outlet, useLocation } from 'react-router-dom'
import { BookOpen, Mic, Settings } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { fetchFamily } from '@/lib/settings'
import { cn } from '@/lib/utils'

const NAV = [
  { to: '/library', label: 'Lessons', icon: BookOpen, match: ['/library', '/lessons'] },
  { to: '/record', label: 'Record', icon: Mic, match: ['/record'] },
  { to: '/settings', label: 'Family', icon: Settings, match: ['/settings'] },
]

/**
 * Persistent chrome for every signed-in page: a top bar with the family name
 * and, on phones, a bottom tab bar so Record is always one thumb-tap away.
 */
export function AppShell() {
  const { familyId } = useAuth()
  const { pathname } = useLocation()
  const [familyName, setFamilyName] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    if (!familyId) return
    fetchFamily(familyId).then((fam) => {
      if (active) setFamilyName(fam?.name ?? null)
    })
    return () => {
      active = false
    }
  }, [familyId])

  const isActive = (match: string[]) => match.some((m) => pathname.startsWith(m))

  return (
    <div className="min-h-svh pb-24 sm:pb-0">
      <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between gap-3 px-4">
          <Link to="/library" className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-accent-foreground">
              <Mic className="h-4 w-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-heading text-lg font-semibold leading-tight">
                {familyName ?? 'Heritage Teacher'}
              </span>
              {familyName && (
                <span className="block text-xs text-muted-foreground">Heritage Teacher</span>
              )}
            </span>
          </Link>

          <nav className="hidden gap-1 sm:flex" aria-label="Main">
            {NAV.map(({ to, label, icon: Icon, match }) => (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors',
                  isActive(match)
                    ? to === '/record'
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-muted text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        <Outlet />
      </main>

      {/* Phone tab bar */}
      <nav
        className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden"
        aria-label="Main"
      >
        <div className="mx-auto grid max-w-md grid-cols-3">
          {NAV.map(({ to, label, icon: Icon, match }) => {
            const active = isActive(match)
            if (to === '/record') {
              return (
                <Link key={to} to={to} className="flex flex-col items-center gap-1 py-2">
                  <span
                    className={cn(
                      '-mt-6 flex h-14 w-14 items-center justify-center rounded-full bg-accent text-accent-foreground shadow-lg ring-4 ring-background transition-transform active:scale-95'
                    )}
                  >
                    <Icon className="h-6 w-6" />
                  </span>
                  <span className={cn('text-xs font-medium', active ? 'text-accent' : 'text-muted-foreground')}>
                    {label}
                  </span>
                </Link>
              )
            }
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  'flex flex-col items-center gap-1 py-3 text-xs font-medium',
                  active ? 'text-foreground' : 'text-muted-foreground'
                )}
              >
                <Icon className="h-5 w-5" />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
