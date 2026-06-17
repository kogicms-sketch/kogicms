-- Public buckets still serve files via their public URL without a broad SELECT
-- policy. Dropping this prevents anon clients from listing/enumerating the bucket.
DROP POLICY IF EXISTS "Voter photos are publicly accessible" ON storage.objects;