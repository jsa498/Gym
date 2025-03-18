import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      workout_sets: {
        Row: {
          id: number
          created_at: string
          username: string
          exercise: string
          warmup: string
          weight: string
          reps: string
          goal: string
        }
        Insert: {
          id?: number
          created_at?: string
          username: string
          exercise: string
          warmup: string
          weight: string
          reps: string
          goal: string
        }
        Update: {
          id?: number
          created_at?: string
          username?: string
          exercise?: string
          warmup?: string
          weight?: string
          reps?: string
          goal?: string
        }
      }
    }
  }
} 