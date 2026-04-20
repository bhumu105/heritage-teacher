# Heritage Teacher

A private web app where grandparents record themselves teaching their language, Whisper transcribes it, Claude translates it, and the whole family can browse the recordings as lesson cards.

Sibling project to [Bridge](../Bridge%20%3A%20Linkup/). v0 scope: family-only, no AI generation, no voice cloning — just a searchable archive of your grandparent's actual voice.

## Stack

- React 18 + Vite + TypeScript
- Tailwind CSS v4 + shadcn/ui
- Supabase (Postgres, Auth, Storage, Edge Functions)
- OpenAI Whisper API (transcription)
- Anthropic Claude Haiku (translation, cultural notes)
- Vercel (hosting)

## Getting started

```bash
pnpm install
cp .env.local.example .env.local   # then fill in the real Supabase values
pnpm dev                            # http://localhost:5173
```

## Project structure

```
src/
  lib/         supabase client, shared types, audio helpers
  components/  RecordButton, LessonCard, ConsentClipPrompt, DeleteConfirm, ui/
  pages/       LoginPage, OnboardingPage, RecordPage, LibraryPage, LessonDetailPage, SettingsPage
  hooks/       useRecording, useTranscribe, useLessons
supabase/
  migrations/  SQL migrations (initial schema with Row Level Security)
  functions/   Edge Functions: transcribe, translate, extract-note
```

## Cost ledger

Tracked in [docs/COST.md](docs/COST.md). Target v0 spend is under $50.

## Consent

Non-negotiable. Before recording anyone:
1. Paper form signed by the teacher (template in `public/consent-form-template.md`).
2. Verbal consent clip at the start of every recording.
3. One-click delete in the app, always available.

No voice cloning or AI-generated speech of any teacher is produced in v0.
