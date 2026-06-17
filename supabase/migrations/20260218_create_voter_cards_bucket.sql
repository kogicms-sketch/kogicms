-- ============================================================================
-- CREATE VOTER CARDS STORAGE BUCKET
-- Purpose: Create storage bucket for voter card images with proper RLS policies
-- Issue: voter-cards bucket doesn't exist, causing upload failures
-- ============================================================================

-- Create the voter-cards storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'voter-cards',
  'voter-cards',
  true, -- Public bucket so images can be viewed
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload voter card images
CREATE POLICY "Authenticated users can upload voter cards"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'voter-cards' AND
  (storage.foldername(name))[1] IS NOT NULL -- Must be in an organization folder
);

-- Allow authenticated users to update their voter cards
CREATE POLICY "Authenticated users can update voter cards"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'voter-cards');

-- Allow public read access to voter card images
CREATE POLICY "Public can view voter cards"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'voter-cards');

-- Allow authenticated users to delete voter cards (for re-uploads)
CREATE POLICY "Authenticated users can delete voter cards"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'voter-cards');
