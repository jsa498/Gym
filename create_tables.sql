-- Create the workout_sets table
CREATE TABLE IF NOT EXISTS workout_sets (
    id BIGSERIAL PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    username TEXT NOT NULL,
    exercise TEXT NOT NULL,
    warmup TEXT NOT NULL,
    weight TEXT NOT NULL,
    reps TEXT NOT NULL,
    goal TEXT NOT NULL
);

-- Enable Row Level Security (RLS)
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;

-- Create a policy that allows all operations (since we're not using auth)
CREATE POLICY "Allow all operations for everyone" ON workout_sets
    FOR ALL
    USING (true)
    WITH CHECK (true);

-- Enable realtime subscriptions for the table
ALTER PUBLICATION supabase_realtime ADD TABLE workout_sets;

-- Create Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default users if they don't exist
INSERT INTO users (username)
VALUES ('Mottu'), ('Babli')
ON CONFLICT (username) DO NOTHING;

-- Create Exercises table
CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL,
  day TEXT NOT NULL, -- Monday, Wednesday, etc.
  name TEXT NOT NULL,
  position INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE (username, day, name)
);

-- Enable realtime subscriptions for exercises
ALTER PUBLICATION supabase_realtime ADD TABLE exercises;

-- Function to update username across all tables
CREATE OR REPLACE FUNCTION update_username(old_username TEXT, new_username TEXT)
RETURNS VOID AS $$
BEGIN
  -- Update in users table
  UPDATE users SET username = new_username WHERE username = old_username;
  
  -- Update in workout_sets table
  UPDATE workout_sets SET username = new_username WHERE username = old_username;
  
  -- Update in exercises table
  UPDATE exercises SET username = new_username WHERE username = old_username;
  
  RETURN;
END;
$$ LANGUAGE plpgsql; 