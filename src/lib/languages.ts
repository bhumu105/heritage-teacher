// Languages offered in onboarding. Codes are ISO 639-1, which is what the
// transcribe Edge Function passes to Whisper as the `language` hint.
export const LANGUAGES: { code: string; name: string }[] = [
  { code: 'ar', name: 'Arabic' },
  { code: 'bs', name: 'Bosnian' },
  { code: 'zh', name: 'Chinese' },
  { code: 'hr', name: 'Croatian' },
  { code: 'cs', name: 'Czech' },
  { code: 'nl', name: 'Dutch' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'hi', name: 'Hindi' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'it', name: 'Italian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'ko', name: 'Korean' },
  { code: 'mk', name: 'Macedonian' },
  { code: 'fa', name: 'Persian' },
  { code: 'pl', name: 'Polish' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'pa', name: 'Punjabi' },
  { code: 'ro', name: 'Romanian' },
  { code: 'ru', name: 'Russian' },
  { code: 'sr', name: 'Serbian' },
  { code: 'sk', name: 'Slovak' },
  { code: 'sl', name: 'Slovene' },
  { code: 'es', name: 'Spanish' },
  { code: 'tl', name: 'Tagalog' },
  { code: 'tr', name: 'Turkish' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'ur', name: 'Urdu' },
  { code: 'vi', name: 'Vietnamese' },
]

const NAME_BY_CODE = new Map(LANGUAGES.map((l) => [l.code, l.name]))

export function languageLabel(code: string): string {
  return NAME_BY_CODE.get(code.toLowerCase()) ?? code.toUpperCase()
}
