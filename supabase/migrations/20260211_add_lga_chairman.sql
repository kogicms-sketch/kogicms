-- Add LGA Chairman column to polling_unit_cells table
-- This will store the chairman name for each polling unit's LGA

ALTER TABLE public.polling_unit_cells 
ADD COLUMN IF NOT EXISTS lga_chairman TEXT;

-- Add comment for documentation
COMMENT ON COLUMN public.polling_unit_cells.lga_chairman IS 'Name of the Local Government Area Chairman';

-- Create index for faster filtering by chairman
CREATE INDEX IF NOT EXISTS idx_polling_unit_cells_lga_chairman 
ON public.polling_unit_cells(lga_chairman);

-- Update existing polling units with chairman data based on LGA
-- Bakori LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Aminu Dan-Hamidu'
WHERE lga = 'Bakori' AND lga_chairman IS NULL;

-- Batagarawa LGA  
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Yahaya Lawal Kawo'
WHERE lga = 'Batagarawa' AND lga_chairman IS NULL;

-- Batsari LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Mannir Muazu Rumah'
WHERE lga = 'Batsari' AND lga_chairman IS NULL;

-- Baure LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Saminu Sulaiman Baure'
WHERE lga = 'Baure' AND lga_chairman IS NULL;

-- Bindawa LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Badaru Musa Giremawa'
WHERE lga = 'Bindawa' AND lga_chairman IS NULL;

-- Charanchi LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Ibrahim Sani Koda'
WHERE lga = 'Charanchi' AND lga_chairman IS NULL;

-- Dandume LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Bishir Sabu Gyazama'
WHERE lga = 'Dandume' AND lga_chairman IS NULL;

-- Danja LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Rabo Tambaya'
WHERE lga = 'Danja' AND lga_chairman IS NULL;

-- Dan Musa LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Ibrahim Namama'
WHERE lga = 'Dan Musa' AND lga_chairman IS NULL;

-- Daura LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Bala Musa'
WHERE lga = 'Daura' AND lga_chairman IS NULL;

-- Dutsi LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Abdulrazaq Adamu Kayawa'
WHERE lga = 'Dutsi' AND lga_chairman IS NULL;

-- Dutsin-Ma LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Kabir Abdul Salam Shema'
WHERE lga = 'Dutsin-Ma' AND lga_chairman IS NULL;

-- Faskari LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Surajo Aliyu Daudawa'
WHERE lga = 'Faskari' AND lga_chairman IS NULL;

-- Funtua LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Abdullahi Goya'
WHERE lga = 'Funtua' AND lga_chairman IS NULL;

-- Ingawa LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Abdullahi Idris II'
WHERE lga = 'Ingawa' AND lga_chairman IS NULL;

-- Jibia LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Surajo Ado Jibia'
WHERE lga = 'Jibia' AND lga_chairman IS NULL;

-- Kafur LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Surajo Bature'
WHERE lga = 'Kafur' AND lga_chairman IS NULL;

-- Kaita LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Bello Lawal Yandaki'
WHERE lga = 'Kaita' AND lga_chairman IS NULL;

-- Kankara LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Kasimu Dantsoho Katoge'
WHERE lga = 'Kankara' AND lga_chairman IS NULL;

-- Kankia LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Lawal Abdul Gezi'
WHERE lga = 'Kankia' AND lga_chairman IS NULL;

-- Katsina LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Isah Miqdad AD Saude'
WHERE lga = 'Katsina' AND lga_chairman IS NULL;

-- Kurfi LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Babangida Abdullahi'
WHERE lga = 'Kurfi' AND lga_chairman IS NULL;

-- Kusada LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Sani Adamu Dan Gamau'
WHERE lga = 'Kusada' AND lga_chairman IS NULL;

-- Mai'Adua LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Mamman Salisu Na-Allahu'
WHERE lga = 'Mai''Adua' AND lga_chairman IS NULL;

-- Malumfashi LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Muntari Abdullahi City'
WHERE lga = 'Malumfashi' AND lga_chairman IS NULL;

-- Mani LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Dr. Yunusa Muhammad Sani'
WHERE lga = 'Mani' AND lga_chairman IS NULL;

-- Mashi LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Salisu Kallan Dan Kada'
WHERE lga = 'Mashi' AND lga_chairman IS NULL;

-- Matazu LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Shamsuddeen Muhammad'
WHERE lga = 'Matazu' AND lga_chairman IS NULL;

-- Musawa LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Aliyu Idris Gin-Gin'
WHERE lga = 'Musawa' AND lga_chairman IS NULL;

-- Rimi LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Muhammad Ali Rimi'
WHERE lga = 'Rimi' AND lga_chairman IS NULL;

-- Sabuwa LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Usamatu Adamu Damari'
WHERE lga = 'Sabuwa' AND lga_chairman IS NULL;

-- Safana LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Abdullahi Sani Brazil'
WHERE lga = 'Safana' AND lga_chairman IS NULL;

-- Sandamu LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Usman Nalado Matawalle'
WHERE lga = 'Sandamu' AND lga_chairman IS NULL;

-- Zango LGA
UPDATE public.polling_unit_cells 
SET lga_chairman = 'Hon. Babangida Yardaje'
WHERE lga = 'Zango' AND lga_chairman IS NULL;
