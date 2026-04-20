import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function OnboardingPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <Card>
        <CardHeader>
          <CardTitle>Set up your family</CardTitle>
          <CardDescription>
            Day 2 will collect family name, teacher profile, and the consent acknowledgement.
          </CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Onboarding form goes here.
        </CardContent>
      </Card>
    </div>
  )
}
