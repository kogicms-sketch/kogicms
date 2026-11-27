-- ==============================================================================
-- KOGI CMS: Comprehensive Database Indexes & Performance Optimization
-- Covers all search, lookup, filter, join, and compound query patterns across:
-- 1. members
-- 2. voter_registry
-- 3. polling_units
-- 4. polling_unit_agents
-- 5. councillors
-- 6. lga_chairmen
-- 7. polling_unit_cells & cell_members
-- 8. profiles & user_roles
-- ==============================================================================

-- 1. Ensure required columns exist on profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS lga text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS ward text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text;

-- 2. MEMBERS TABLE
CREATE INDEX IF NOT EXISTS idx_members_lga ON public.members (lga);
CREATE INDEX IF NOT EXISTS idx_members_ward ON public.members (ward);
CREATE INDEX IF NOT EXISTS idx_members_lga_ward ON public.members (lga, ward);
CREATE INDEX IF NOT EXISTS idx_members_lga_ward_pu ON public.members (lga, ward, polling_unit_id);
CREATE INDEX IF NOT EXISTS idx_members_pu_id ON public.members (polling_unit_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members (phone);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members (email);
CREATE INDEX IF NOT EXISTS idx_members_role ON public.members (role);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members (status);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON public.members (organization_id);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_members_voters_card_id ON public.members (voters_card_id);
CREATE INDEX IF NOT EXISTS idx_members_gender ON public.members (gender);
CREATE INDEX IF NOT EXISTS idx_members_full_name ON public.members (full_name);
CREATE INDEX IF NOT EXISTS idx_members_is_verified ON public.members (is_verified);
CREATE INDEX IF NOT EXISTS idx_members_pvc_status ON public.members (pvc_status);

-- 3. VOTER REGISTRY TABLE
CREATE INDEX IF NOT EXISTS idx_voter_registry_lga ON public.voter_registry (lga);
CREATE INDEX IF NOT EXISTS idx_voter_registry_ward ON public.voter_registry (ward);
CREATE INDEX IF NOT EXISTS idx_voter_registry_lga_ward ON public.voter_registry (lga, ward);
CREATE INDEX IF NOT EXISTS idx_voter_registry_lga_ward_pu ON public.voter_registry (lga, ward, polling_unit_code);
CREATE INDEX IF NOT EXISTS idx_voter_registry_pu_code ON public.voter_registry (polling_unit_code);
CREATE INDEX IF NOT EXISTS idx_voter_registry_gender ON public.voter_registry (gender);
CREATE INDEX IF NOT EXISTS idx_voter_registry_full_name ON public.voter_registry (full_name);
CREATE INDEX IF NOT EXISTS idx_voter_registry_dob_year ON public.voter_registry (dob_year);

-- 4. POLLING UNITS TABLE
CREATE INDEX IF NOT EXISTS idx_polling_units_code ON public.polling_units (code);
CREATE INDEX IF NOT EXISTS idx_polling_units_lga_name ON public.polling_units (lga_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_ward_name ON public.polling_units (ward_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_lga_ward ON public.polling_units (lga_name, ward_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_lga_id ON public.polling_units (lga_id);
CREATE INDEX IF NOT EXISTS idx_polling_units_ward_id ON public.polling_units (ward_id);
CREATE INDEX IF NOT EXISTS idx_polling_units_name ON public.polling_units (name);

-- 5. POLLING UNIT AGENTS TABLE
CREATE INDEX IF NOT EXISTS idx_pu_agents_user_id ON public.polling_unit_agents (user_id);
CREATE INDEX IF NOT EXISTS idx_pu_agents_lga ON public.polling_unit_agents (lga);
CREATE INDEX IF NOT EXISTS idx_pu_agents_ward ON public.polling_unit_agents (ward);
CREATE INDEX IF NOT EXISTS idx_pu_agents_lga_ward ON public.polling_unit_agents (lga, ward);
CREATE INDEX IF NOT EXISTS idx_pu_agents_lga_ward_pu ON public.polling_unit_agents (lga, ward, polling_unit_id);
CREATE INDEX IF NOT EXISTS idx_pu_agents_pu_id ON public.polling_unit_agents (polling_unit_id);
CREATE INDEX IF NOT EXISTS idx_pu_agents_councillor_id ON public.polling_unit_agents (councillor_id);
CREATE INDEX IF NOT EXISTS idx_pu_agents_email ON public.polling_unit_agents (email);
CREATE INDEX IF NOT EXISTS idx_pu_agents_phone ON public.polling_unit_agents (phone);
CREATE INDEX IF NOT EXISTS idx_pu_agents_name ON public.polling_unit_agents (agent_name);
CREATE INDEX IF NOT EXISTS idx_pu_agents_is_active ON public.polling_unit_agents (is_active);

-- 6. COUNCILLORS TABLE
CREATE INDEX IF NOT EXISTS idx_councillors_user_id ON public.councillors (user_id);
CREATE INDEX IF NOT EXISTS idx_councillors_chairman_id ON public.councillors (chairman_id);
CREATE INDEX IF NOT EXISTS idx_councillors_lga ON public.councillors (lga);
CREATE INDEX IF NOT EXISTS idx_councillors_ward ON public.councillors (ward);
CREATE INDEX IF NOT EXISTS idx_councillors_lga_ward ON public.councillors (lga, ward);
CREATE INDEX IF NOT EXISTS idx_councillors_phone ON public.councillors (phone);
CREATE INDEX IF NOT EXISTS idx_councillors_name ON public.councillors (councillor_name);
CREATE INDEX IF NOT EXISTS idx_councillors_is_active ON public.councillors (is_active);

-- 7. LGA CHAIRMEN TABLE
CREATE INDEX IF NOT EXISTS idx_lga_chairmen_user_id ON public.lga_chairmen (user_id);
CREATE INDEX IF NOT EXISTS idx_lga_chairmen_lga ON public.lga_chairmen (lga);
CREATE INDEX IF NOT EXISTS idx_lga_chairmen_is_active ON public.lga_chairmen (is_active);

-- 8. POLLING UNIT CELLS & CELL MEMBERS
CREATE INDEX IF NOT EXISTS idx_pu_cells_lga ON public.polling_unit_cells (lga);
CREATE INDEX IF NOT EXISTS idx_pu_cells_ward ON public.polling_unit_cells (ward);
CREATE INDEX IF NOT EXISTS idx_pu_cells_lga_ward ON public.polling_unit_cells (lga, ward);
CREATE INDEX IF NOT EXISTS idx_pu_cells_lga_ward_pu ON public.polling_unit_cells (lga, ward, polling_unit_id);
CREATE INDEX IF NOT EXISTS idx_pu_cells_pu_id ON public.polling_unit_cells (polling_unit_id);
CREATE INDEX IF NOT EXISTS idx_pu_cells_leader_phone ON public.polling_unit_cells (leader_phone);

CREATE INDEX IF NOT EXISTS idx_cell_members_cell_id ON public.cell_members (cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_members_member_id ON public.cell_members (member_id);
CREATE INDEX IF NOT EXISTS idx_cell_members_pu_id ON public.cell_members (polling_unit_id);

-- 9. PROFILES & USER ROLES
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);
CREATE INDEX IF NOT EXISTS idx_profiles_lga ON public.profiles (lga);
CREATE INDEX IF NOT EXISTS idx_profiles_ward ON public.profiles (ward);
CREATE INDEX IF NOT EXISTS idx_profiles_lga_ward ON public.profiles (lga, ward);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles (role);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);
