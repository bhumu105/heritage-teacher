import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function RecordPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Record a lesson</CardTitle>
          <CardDescription>
            Day 3 will wire the verbal consent clip + MediaRecorder capture here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Record button goes here.
        </CardContent>
      </Card>
    </div>
  )
}
