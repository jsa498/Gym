-- Add day_order column if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'user_days' AND column_name = 'day_order'
  ) THEN
    ALTER TABLE user_days ADD COLUMN day_order INTEGER;
  END IF;
END $$;

-- Update day_order based on day name
UPDATE user_days
SET day_order = CASE day
    WHEN 'Monday' THEN 1
    WHEN 'Tuesday' THEN 2
    WHEN 'Wednesday' THEN 3
    WHEN 'Thursday' THEN 4
    WHEN 'Friday' THEN 5
    WHEN 'Saturday' THEN 6
    WHEN 'Sunday' THEN 7
    ELSE 8
END
WHERE day_order IS NULL; 