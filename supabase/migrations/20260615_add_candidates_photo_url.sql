-- Add photo_url to candidates tables
ALTER TABLE federal_reps ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE senatorial_leaders ADD COLUMN IF NOT EXISTS photo_url TEXT;
