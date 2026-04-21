// Edge Function: POST /transcribe  body: { session_id: string }
// Downloads the raw recording from Storage, calls Whisper, writes a lessons row,
// and flips the session status to 'ready'. Re-enforces consent server-side.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const OPENAI_API_KEY = Deno.env.get('OPENAI_API_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

interface Body {
  session_id: string
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405)
  }
  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  if (!body.session_id) return json({ error: 'missing_session_id' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  // 1. Load the session.
  const { data: session, error: sErr } = await admin
    .from('recording_sessions')
    .select('*')
    .eq('id', body.session_id)
    .single()
  if (sErr || !session) return json({ error: 'session_not_found' }, 404)
  if (!session.raw_audio_uri) return json({ error: 'no_audio' }, 400)
  if (!session.consent_clip_uri) return json({ error: 'missing_consent_clip' }, 403)

  // 2. Verify there's an active 'record' consent for this teacher.
  const { data: consents } = await admin
    .from('consent_records')
    .select('id')
    .eq('teacher_id', session.teacher_id)
    .eq('scope', 'record')
    .is('revoked_at', null)
    .limit(1)
  if (!consents || consents.length === 0) {
    return json({ error: 'no_record_consent' }, 403)
  }

  await admin
    .from('recording_sessions')
    .update({ status: 'transcribing' })
    .eq('id', session.id)

  // 3. Download the audio blob from storage.
  const { data: audioBlob, error: dErr } = await admin.storage
    .from('recordings')
    .download(session.raw_audio_uri.replace(/^recordings\//, ''))
  if (dErr || !audioBlob) {
    await admin.from('recording_sessions').update({ status: 'failed' }).eq('id', session.id)
    return json({ error: 'download_failed', detail: dErr?.message }, 500)
  }

  // 4. Call Whisper.
  const form = new FormData()
  form.append('file', audioBlob, 'audio.webm')
  form.append('model', 'whisper-1')
  form.append('response_format', 'verbose_json')
  const whisperResp = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: form,
  })
  if (!whisperResp.ok) {
    const detail = await whisperResp.text()
    await admin.from('recording_sessions').update({ status: 'failed' }).eq('id', session.id)
    return json({ error: 'whisper_failed', detail }, 502)
  }
  const whisper = await whisperResp.json() as {
    text: string
    language?: string
  }

  // 5. Write the lesson, mark session ready.
  const { data: lesson, error: lErr } = await admin
    .from('lessons')
    .insert({
      session_id: session.id,
      family_id: session.family_id,
      transcript: whisper.text,
      language_code: whisper.language ?? 'unknown',
    })
    .select()
    .single()
  if (lErr || !lesson) {
    await admin.from('recording_sessions').update({ status: 'failed' }).eq('id', session.id)
    return json({ error: 'insert_failed', detail: lErr?.message }, 500)
  }
  await admin.from('recording_sessions').update({ status: 'ready' }).eq('id', session.id)

  return json({
    lesson_id: lesson.id,
    transcript: lesson.transcript,
    language_code: lesson.language_code,
  })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}
