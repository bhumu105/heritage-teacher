// Hand-written types that mirror the Supabase schema.
// Regenerate with `supabase gen types typescript --linked > src/lib/database.types.ts`
// once the project is linked — but these by-hand types keep v0 unblocked.

export type UUID = string

export type ConsentScope = 'record' | 'archive' | 'train' | 'voice'
export type ConsentSource = 'paper-signed' | 'verbal-clip' | 'app-checkbox'
export type SessionStatus =
  | 'pending'
  | 'transcribing'
  | 'ready'
  | 'failed'
  | 'deleted'
export type FamilyRole = 'owner' | 'member'

export interface Family {
  id: UUID
  name: string
  created_by: UUID
  created_at: string
}

export interface FamilyMember {
  family_id: UUID
  user_id: UUID
  role: FamilyRole
  added_at: string
}

export interface Teacher {
  id: UUID
  family_id: UUID
  display_name: string
  native_language: string
  created_at: string
}

export interface ConsentRecord {
  id: UUID
  teacher_id: UUID
  scope: ConsentScope
  granted_at: string
  granted_via: ConsentSource
  evidence_uri: string | null
  revoked_at: string | null
}

export interface RecordingSession {
  id: UUID
  family_id: UUID
  teacher_id: UUID
  recorded_by: UUID
  started_at: string
  duration_seconds: number | null
  consent_clip_uri: string | null
  status: SessionStatus
  raw_audio_uri: string | null
}

export interface Lesson {
  id: UUID
  session_id: UUID
  family_id: UUID
  title: string | null
  transcript: string
  translation: string | null
  cultural_note: string | null
  language_code: string
  created_at: string
  deleted_at: string | null
}

// Narrow database shape — expand as Supabase codegen matures.
// The Supabase client is typed to <Database>; missing tables surface as errors.
export interface Database {
  public: {
    Tables: {
      families: { Row: Family; Insert: Partial<Family>; Update: Partial<Family> }
      family_members: {
        Row: FamilyMember
        Insert: Partial<FamilyMember>
        Update: Partial<FamilyMember>
      }
      teachers: {
        Row: Teacher
        Insert: Partial<Teacher>
        Update: Partial<Teacher>
      }
      consent_records: {
        Row: ConsentRecord
        Insert: Partial<ConsentRecord>
        Update: Partial<ConsentRecord>
      }
      recording_sessions: {
        Row: RecordingSession
        Insert: Partial<RecordingSession>
        Update: Partial<RecordingSession>
      }
      lessons: {
        Row: Lesson
        Insert: Partial<Lesson>
        Update: Partial<Lesson>
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
  }
}
