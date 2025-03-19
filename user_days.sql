-- Create user_days table to store each user's workout days
CREATE TABLE IF NOT EXISTS user_days (
    id SERIAL PRIMARY KEY,
    username TEXT NOT NULL,
    day TEXT NOT NULL,
    day_order INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (username, day)
);

-- Enable realtime subscriptions for the table
ALTER PUBLICATION supabase_realtime ADD TABLE user_days;

-- Function to get day order value
CREATE OR REPLACE FUNCTION get_day_order(day_name TEXT) 
RETURNS INTEGER AS $$
BEGIN
    RETURN CASE day_name
        WHEN 'Monday' THEN 1
        WHEN 'Tuesday' THEN 2
        WHEN 'Wednesday' THEN 3
        WHEN 'Thursday' THEN 4
        WHEN 'Friday' THEN 5
        WHEN 'Saturday' THEN 6
        WHEN 'Sunday' THEN 7
        ELSE 8  -- For any other value
    END;
END;
$$ LANGUAGE plpgsql;

-- Create default user days for existing users
INSERT INTO user_days (username, day, day_order)
SELECT username, day, get_day_order(day)
FROM (
    VALUES
        ('Mottu', 'Monday'),
        ('Mottu', 'Wednesday'),
        ('Mottu', 'Thursday'),
        ('Babli', 'Monday'),
        ('Babli', 'Wednesday'),
        ('Babli', 'Thursday'),
        ('Babli', 'Saturday')
) AS default_days(username, day)
ON CONFLICT (username, day) DO NOTHING; 