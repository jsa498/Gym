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