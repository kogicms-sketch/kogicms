ALTER TABLE public.members ADD COLUMN IF NOT EXISTS date_of_birth date;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS gender text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS voters_card_id text;
ALTER TABLE public.members ADD COLUMN IF NOT EXISTS voters_card_image_url text;
