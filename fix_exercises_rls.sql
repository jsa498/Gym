-- Fix Row Level Security for exercises table
-- Add auth_id column to exercises table if it does not exist
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS auth_id UUID REFERENCES auth.users(id);
-- Update existing exercises with auth_id from users table
UPDATE exercises e SET auth_id = u.auth_id FROM users u WHERE e.username = u.username AND u.auth_id IS NOT NULL AND e.auth_id IS NULL;
-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS exercises_auth_id_idx ON exercises(auth_id);
CREATE INDEX IF NOT EXISTS exercises_username_idx ON exercises(username);
-- Enable RLS on exercises table
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
-- Drop existing policies to recreate them
DROP POLICY IF EXISTS "Users can view exercises for usernames they own" ON exercises;
DROP POLICY IF EXISTS "Users can insert exercises for usernames they own" ON exercises;
DROP POLICY IF EXISTS "Users can update exercises for usernames they own" ON exercises;
DROP POLICY IF EXISTS "Users can delete exercises for usernames they own" ON exercises;
DROP POLICY IF EXISTS "Users can manage their own exercises" ON exercises;
-- Create a single policy for all operations
CREATE POLICY "Users can manage their own exercises"
ON exercises FOR ALL
USING (
  auth_id = auth.uid()
  OR
  EXISTS (
    SELECT 1 FROM users
    WHERE users.username = exercises.username
    AND users.auth_id = auth.uid()
  )
);
