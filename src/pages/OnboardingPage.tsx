import { useState, type FormEvent } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuth } from '@/hooks/useAuth'
import { LANGUAGES } from '@/lib/languages'
import { supabase } from '@/lib/supabase'

/**
 * First-run flow. Creates: family → self as owner member → teacher → two
 * baseline consent records (record + archive). `train` and `voice` scopes are
 * intentionally NOT granted here — they require a paper signature in v1+.
 * Order matters: the RLS policies require family_members to exist before
 * teachers/consents can be written.
 */
export function OnboardingPage() {
  const { user, familyId, loading, refreshFamily } = useAuth()
  const navigate = useNavigate()

  const [familyName, setFamilyName] = useState('')
  const [teacherName, setTeacherName] = useState('')
  const [languageChoice, setLanguageChoice] = useState('')
  const [customLanguage, setCustomLanguage] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const language = languageChoice === 'other' ? customLanguage : languageChoice

  if (loading) return null
  if (!user) return <Navigate to="/login" replace />
  if (familyId) return <Navigate to="/library" replace />

  const canSubmit =
    !submitting &&
    consent &&
    familyName.trim().length > 0 &&
    teacherName.trim().length > 0 &&
    language.trim().length >= 2

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!user || !canSubmit) return
    setSubmitting(true)
    setErrorMsg(null)

    // Fetch current session + user directly from Supabase (not React state).
    const [{ data: sessionData }, { data: fresh, error: freshErr }] =
      await Promise.all([supabase.auth.getSession(), supabase.auth.getUser()])

    const sessionPresent = !!sessionData.session
    const jwtUserId = sessionData.session?.user?.id ?? null
    const verifiedUserId = fresh.user?.id ?? null

    if (freshErr || !verifiedUserId) {
      setErrorMsg(
        `Session check failed. ` +
          `session=${sessionPresent ? 'present' : 'MISSING'} ` +
          `reactUserId=${user?.id ?? 'null'} ` +
          `error=${freshErr?.message ?? 'no user returned'}`
      )
      setSubmitting(false)
      return
    }

    const userId = verifiedUserId

    // 1. Create family.
    const { data: family, error: famErr } = await supabase
      .from('families')
      .insert({ name: familyName.trim(), created_by: userId })
      .select('id')
      .single()
    if (famErr || !family) {
      setErrorMsg(
        `Insert families failed. ` +
          `code=${famErr?.code ?? '?'} ` +
          `msg=${famErr?.message ?? '?'} ` +
          `sessionPresent=${sessionPresent} ` +
          `jwtUserId=${jwtUserId} ` +
          `verifiedUserId=${verifiedUserId} ` +
          `reactUserId=${user?.id ?? 'null'}`
      )
      setSubmitting(false)
      return
    }

    // 2. Add self as owner — must happen before inserting teacher (RLS).
    const { error: memErr } = await supabase.from('family_members').insert({
      family_id: family.id,
      user_id: userId,
      role: 'owner',
    })
    if (memErr) {
      setErrorMsg(memErr.message)
      setSubmitting(false)
      return
    }

    // 3. Create the teacher (the grandparent).
    const { data: teacher, error: teacherErr } = await supabase
      .from('teachers')
      .insert({
        family_id: family.id,
        display_name: teacherName.trim(),
        native_language: language.trim().toLowerCase(),
      })
      .select('id')
      .single()
    if (teacherErr || !teacher) {
      setErrorMsg(teacherErr?.message ?? 'Could not create teacher')
      setSubmitting(false)
      return
    }

    // 4. Grant the two baseline consent scopes.
    const consentRows = (['record', 'archive'] as const).map((scope) => ({
      teacher_id: teacher.id,
      scope,
      granted_via: 'app-checkbox' as const,
    }))
    const { error: cErr } = await supabase.from('consent_records').insert(consentRows)
    if (cErr) {
      setErrorMsg(cErr.message)
      setSubmitting(false)
      return
    }

    await refreshFamily()
    navigate('/library', { replace: true })
  }

  return (
    <div className="mx-auto max-w-2xl p-4 py-8 sm:p-6 sm:py-12">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Set up your family</CardTitle>
          <CardDescription>
            Create a private space for your grandparent's lessons. Only people you
            invite will ever see recordings.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="familyName">Family name</Label>
              <Input
                id="familyName"
                required
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="The Horvat family"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                Used as the title of your lesson library. You can change it later.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="teacherName">Grandparent's display name</Label>
              <Input
                id="teacherName"
                required
                value={teacherName}
                onChange={(e) => setTeacherName(e.target.value)}
                placeholder="Grandma Ana"
                disabled={submitting}
              />
              <p className="text-xs text-muted-foreground">
                How they're listed in the library. A nickname is fine.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="language">Which language do they speak?</Label>
              <select
                id="language"
                required
                value={languageChoice}
                onChange={(e) => setLanguageChoice(e.target.value)}
                disabled={submitting}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              >
                <option value="" disabled>
                  Choose a language…
                </option>
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.name}
                  </option>
                ))}
                <option value="other">Another language…</option>
              </select>
              {languageChoice === 'other' && (
                <>
                  <Input
                    aria-label="Language code"
                    value={customLanguage}
                    onChange={(e) => setCustomLanguage(e.target.value)}
                    maxLength={5}
                    placeholder="Two-letter code, e.g. sq for Albanian"
                    disabled={submitting}
                  />
                  <p className="text-xs text-muted-foreground">
                    Use the two-letter ISO 639-1 code so transcription knows
                    which language to listen for.
                  </p>
                </>
              )}
            </div>

            <div className="space-y-3 rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-sm font-medium">Consent acknowledgement</p>
              <p className="text-sm text-muted-foreground">
                I've spoken with my grandparent and they understand their voice
                will be recorded, transcribed, and kept in a private archive that
                only our family can see. They can ask to delete any recording at
                any time, and I'll respect that immediately.
              </p>
              <label className="flex items-start gap-2 text-sm">
                <Checkbox
                  checked={consent}
                  onCheckedChange={(v) => setConsent(v === true)}
                  disabled={submitting}
                  className="mt-0.5"
                />
                <span>
                  Yes — we had this conversation and my grandparent agreed.
                </span>
              </label>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={!canSubmit}>
              {submitting ? 'Setting up…' : 'Create family'}
            </Button>

            {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
