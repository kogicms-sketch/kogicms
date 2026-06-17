-- Add media metrics to activities
ALTER TABLE support_group_activities
ADD COLUMN IF NOT EXISTS media_reach integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS media_links text[];
