-- Migration: Add social media handle and bank details to members

ALTER TABLE members 
ADD COLUMN IF NOT EXISTS social_media_handle TEXT,
ADD COLUMN IF NOT EXISTS bank_name TEXT,
ADD COLUMN IF NOT EXISTS account_number TEXT;
