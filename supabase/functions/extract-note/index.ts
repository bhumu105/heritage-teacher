// Edge Function: POST /extract-note  body: { lesson_id: string }
// If the transcript contains a brief story or cultural aside around a
// vocabulary item, extract a single-sentence "cultural note" for the lesson
// card. Returns null if there's nothing worth noting.

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
    .select('id, transcript, translation, cultural_note, language_code')
    .eq('id', body.lesson_id)
    .single()
  if (error || !lesson) return json({ error: 'lesson_not_found' }, 404)
  if (lesson.cultural_note) return json({ lesson_id: lesson.id, cultural_note: lesson.cultural_note })

  const prompt = `You are reading a transcript of a grandparent teaching their family their native language (language code: ${lesson.language_code}).

If the transcript contains a brief personal story, memory, or cultural aside the grandparent mentions while teaching a word or phrase, summarise it in ONE sentence, in English, as if captioning it for a family keepsake. Keep the grandparent's voice and warmth.

If there is no story or aside — just vocabulary drill — respond with exactly "NONE".

Transcript (source language):
"""
${lesson.transcript}
"""

English translation (for context):
"""
${lesson.translation ?? '(not yet translated)'}
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
      max_tokens: 256,
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
  const raw = data.content
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n')
    .trim()
  const cultural_note = raw === 'NONE' ? null : raw

  const { error: uErr } = await admin
    .from('lessons')
    .update({ cultural_note })
    .eq('id', lesson.id)
  if (uErr) return json({ error: 'update_failed', detail: uErr.message }, 500)

  return json({ lesson_id: lesson.id, cultural_note })
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  })
}
