import { useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LessonDetailPage() {
  const { id } = useParams<{ id: string }>()
  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Lesson {id}</CardTitle>
          <CardDescription>
            Day 5 will render audio player + transcript + translation + delete.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Lesson detail goes here.
        </CardContent>
      </Card>
    </div>
  )
}
