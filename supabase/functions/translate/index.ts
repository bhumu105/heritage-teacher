// Edge Function: POST /translate  body: { lesson_id: string }
// Reads a lesson's transcript, asks Claude Haiku for an English translation,
// writes it back to the lesson row.

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = 'claude-haiku-4-5-20251001'

interface Body {
  lesson_id: string
}

serve(async (req) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)
  let body: Body
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid_json' }, 400)
  }
  if (!body.lesson_id) return json({ error: 'missing_lesson_id' }, 400)

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false },
  })

  const { data: lesson, error } = await admin
    .from('lessons')
    .select('id, transcript, language_code, translation')
    .eq('id', body.lesson_id)
    .single()
  if (error || !lesson) return json({ error: 'lesson_not_found' }, 404)
  if (lesson.translation) return json({ lesson_id: lesson.id, translation: lesson.translation })

  const prompt = `You are translating a short audio transcript of a grandparent teaching their family their native language. The source language code is "${lesson.language_code}".

Translate this to natural, conversational English. Preserve the teaching intent — if they are pointing out a word and then using it in a sentence, keep that structure. Output ONLY the translation, no preamble.

Transcript:
"""
${lesson.transcript}
"""`

  const resp = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  })
  if (!resp.ok) {
    const detail = await resp.text()
    return json({ error: 'claude_failed', detail }, 502)
  }
  const data = await resp.json() as {
    content: Array<{ type: string; text: string }>
  }
  const translation = data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim()

  const { error: uErr } = await admin
    .from('lessons')
    .update({ translation })
    .eq('id', lesson.id)
  if (uErr) return json({ error: 'update_failed', detail: uErr.message }, 500)

  return json({ lesson_id: lesson.id, translation })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
