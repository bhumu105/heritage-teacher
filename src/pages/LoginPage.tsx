import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Heritage Teacher</CardTitle>
          <CardDescription>
            Day 2 will wire Supabase magic-link auth here.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Sign-in form goes here.
        </CardContent>
      </Card>
    </div>
  )
}
