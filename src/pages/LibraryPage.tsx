import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Mic, Settings } from 'lucide-react'

export function LibraryPage() {
  return (
    <div className="mx-auto max-w-4xl p-6">
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Heritage Teacher</h1>
          <p className="text-sm text-muted-foreground">
            Your family's recorded lessons.
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/record">
              <Mic /> Record
            </Link>
          </Button>
          <Button variant="outline" size="icon" asChild>
            <Link to="/settings" aria-label="Settings">
              <Settings />
            </Link>
          </Button>
        </div>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>No lessons yet</CardTitle>
          <CardDescription>
            Day 5 will render the lesson grid. Record your first lesson to see it appear here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          LibraryGrid component goes here.
        </CardContent>
      </Card>
    </div>
  )
}
