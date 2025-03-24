import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// Function to apply database fixes (will be run from post-signup-setup.tsx)
export async function applyDatabaseFixes() {
  try {
    // 1. Check if auth_id column exists in user_days table, if not add it
    const { data: columnCheck } = await supabase
      .rpc('check_column_exists', { 
        table_name: 'user_days',
        column_name: 'auth_id'
      });
    
    if (!columnCheck) {
      // Create the function if it doesn't exist
      await supabase.rpc('create_check_column_exists_function');
      
      // Add auth_id column
      await supabase
        .rpc('execute_sql', {
          sql: 'ALTER TABLE user_days ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id)'
        });
    }
    
    // 2. Update user_days constraint if needed
    await supabase
      .rpc('execute_sql', {
        sql: 'ALTER TABLE user_days DROP CONSTRAINT IF EXISTS user_days_username_day_key; ALTER TABLE user_days ADD CONSTRAINT IF NOT EXISTS user_days_username_day_key UNIQUE (username, day);'
      });
      
    // 3. Create indexes to speed up queries
    await supabase
      .rpc('execute_sql', {
        sql: 'CREATE INDEX IF NOT EXISTS user_days_username_idx ON user_days(username); CREATE INDEX IF NOT EXISTS user_days_auth_id_idx ON user_days(auth_id);'
      });
      
    // 4. Update existing user_days entries to add auth_id from users table
    await supabase
      .rpc('execute_sql', {
        sql: "UPDATE user_days ud SET auth_id = u.auth_id FROM users u WHERE ud.username = u.username AND u.auth_id IS NOT NULL AND ud.auth_id IS NULL;"
      });
      
    console.log('Database fixes applied successfully');
    return { success: true };
  } catch (error) {
    console.error('Error applying database fixes:', error);
    return { success: false, error };
  }
}

// Create function to check if column exists
export async function createSupportFunctions() {
  try {
    // Create function to check if column exists
    await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION check_column_exists(table_name text, column_name text) 
          RETURNS boolean AS $$
          BEGIN
              RETURN EXISTS (
                  SELECT FROM information_schema.columns 
                  WHERE table_schema = 'public' 
                  AND table_name = check_column_exists.table_name 
                  AND column_name = check_column_exists.column_name
              );
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });
      
    // Create function to execute SQL (needs to be created by admin)
    await supabase
      .rpc('execute_sql', {
        sql: `
          CREATE OR REPLACE FUNCTION execute_sql(sql text) 
          RETURNS void AS $$
          BEGIN
              EXECUTE sql;
          END;
          $$ LANGUAGE plpgsql SECURITY DEFINER;
        `
      });
      
    console.log('Support functions created successfully');
    return { success: true };
  } catch (error) {
    console.error('Error creating support functions:', error);
    return { success: false, error };
  }
}

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