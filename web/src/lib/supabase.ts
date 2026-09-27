import { createClient } from '@supabase/supabase-js'

export const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
export const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
})

export interface Projekt { id: string; namn: string; skapad: string }
export interface Meddelande { id?: string; roll: 'user' | 'assistant'; text: string; bilder: string[]; skapad?: string }
export interface Bild { id: string; typ: 'rum' | 'moodboard'; sokvag: string; skapad?: string }
