-- ============================================================================
-- SEED ALL 34 LGA CHAIRMEN
-- Creates chairman accounts with default credentials
-- Based on katsina_lga_chairmen.csv
-- ============================================================================

-- Default password pattern: {lga_name}@cms
-- Default email pattern: {lga_name}cms@gmail.com
-- All chairmen must change password on first login

SELECT create_lga_chairman('Bakori', 'Hon. Aminu Dan-Hamidu', 'bakoricms@gmail.com', 'bakori@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Batagarawa', 'Hon. Yahaya Lawal Kawo', 'batagarawacms@gmail.com', 'batagarawa@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Batsari', 'Hon. Mannir Muazu Rumah', 'batsaricms@gmail.com', 'batsari@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Baure', 'Hon. Saminu Sulaiman Baure', 'baurecms@gmail.com', 'baure@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Bindawa', 'Hon. Badaru Musa Giremawa', 'bindawacms@gmail.com', 'bindawa@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Charanchi', 'Hon. Ibrahim Sani Koda', 'charanchicms@gmail.com', 'charanchi@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Dandume', 'Hon. Bishir Sabu Gyazama', 'dandumecms@gmail.com', 'dandume@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Danja', 'Hon. Rabo Tambaya', 'danjacms@gmail.com', 'danja@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Dan Musa', 'Hon. Ibrahim Namama', 'danmusacms@gmail.com', 'danmusa@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Daura', 'Hon. Bala Musa', 'dauracms@gmail.com', 'daura@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Dutsi', 'Hon. Abdulrazaq Adamu Kayawa', 'dutsicms@gmail.com', 'dutsi@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Dutsin-Ma', 'Hon. Kabir Abdul Salam Shema', 'dutsinmacms@gmail.com', 'dutsinma@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Faskari', 'Hon. Surajo Aliyu Daudawa', 'faskaricms@gmail.com', 'faskari@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Funtua', 'Hon. Abdullahi Goya', 'funtuacms@gmail.com', 'funtua@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Ingawa', 'Hon. Abdullahi Idris II', 'ingawacms@gmail.com', 'ingawa@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Jibia', 'Hon. Surajo Ado Jibia', 'jibiacms@gmail.com', 'jibia@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Kafur', 'Hon. Surajo Bature', 'kafurcms@gmail.com', 'kafur@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Kaita', 'Hon. Bello Lawal Yandaki', 'kaitacms@gmail.com', 'kaita@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Kankara', 'Hon. Kasimu Dantsoho Katoge', 'kankaracms@gmail.com', 'kankara@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Kankia', 'Hon. Lawal Abdul Gezi', 'kankiacms@gmail.com', 'kankia@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Katsina', 'Hon. Isah Miqdad AD Saude', 'katsinacms@gmail.com', 'katsina@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Kurfi', 'Hon. Babangida Abdullahi', 'kurficms@gmail.com', 'kurfi@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Kusada', 'Hon. Sani Adamu Dan Gamau', 'kusadacms@gmail.com', 'kusada@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Mai''Adua', 'Hon. Mamman Salisu Na-Allahu', 'maiaduacms@gmail.com', 'maiadua@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Malumfashi', 'Hon. Muntari Abdullahi City', 'malumfashicms@gmail.com', 'malumfashi@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Mani', 'Hon. Dr. Yunusa Muhammad Sani', 'manicms@gmail.com', 'mani@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Mashi', 'Hon. Salisu Kallan Dan Kada', 'mashicms@gmail.com', 'mashi@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Matazu', 'Hon. Shamsuddeen Muhammad', 'matazucms@gmail.com', 'matazu@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Musawa', 'Hon. Aliyu Idris Gin-Gin', 'musawacms@gmail.com', 'musawa@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Rimi', 'Hon. Muhammad Ali Rimi', 'rimicms@gmail.com', 'rimi@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Sabuwa', 'Hon. Usamatu Adamu Damari', 'sabuwacms@gmail.com', 'sabuwa@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Safana', 'Hon. Abdullahi Sani Brazil', 'safanacms@gmail.com', 'safana@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Sandamu', 'Hon. Usman Nalado Matawalle', 'sandamucms@gmail.com', 'sandamu@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);
SELECT create_lga_chairman('Zango', 'Hon. Babangida Yardaje', 'zangocms@gmail.com', 'zango@cms', NULL, 'APC', '2025-02-15'::date, '2025-04-15'::date);

-- ============================================================================
-- SEEDING COMPLETE - 34 CHAIRMEN CREATED
-- ============================================================================
