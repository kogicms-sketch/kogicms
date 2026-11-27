-- Performance and query indexes for election campaign tables

-- 1. Members indexes
CREATE INDEX IF NOT EXISTS idx_members_lga ON public.members (lga);
CREATE INDEX IF NOT EXISTS idx_members_ward ON public.members (ward);
CREATE INDEX IF NOT EXISTS idx_members_lga_ward ON public.members (lga, ward);
CREATE INDEX IF NOT EXISTS idx_members_pu_id ON public.members (polling_unit_id);
CREATE INDEX IF NOT EXISTS idx_members_phone ON public.members (phone);
CREATE INDEX IF NOT EXISTS idx_members_email ON public.members (email);
CREATE INDEX IF NOT EXISTS idx_members_role ON public.members (role);
CREATE INDEX IF NOT EXISTS idx_members_status ON public.members (status);
CREATE INDEX IF NOT EXISTS idx_members_org_id ON public.members (organization_id);
CREATE INDEX IF NOT EXISTS idx_members_created_at ON public.members (created_at DESC);

-- 2. Voter Registry indexes
CREATE INDEX IF NOT EXISTS idx_voter_registry_lga ON public.voter_registry (lga);
CREATE INDEX IF NOT EXISTS idx_voter_registry_ward ON public.voter_registry (ward);
CREATE INDEX IF NOT EXISTS idx_voter_registry_lga_ward ON public.voter_registry (lga, ward);
CREATE INDEX IF NOT EXISTS idx_voter_registry_pu_code ON public.voter_registry (polling_unit_code);
CREATE INDEX IF NOT EXISTS idx_voter_registry_gender ON public.voter_registry (gender);

-- 3. Polling Units indexes
CREATE INDEX IF NOT EXISTS idx_polling_units_code ON public.polling_units (code);
CREATE INDEX IF NOT EXISTS idx_polling_units_lga_name ON public.polling_units (lga_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_ward_name ON public.polling_units (ward_name);
CREATE INDEX IF NOT EXISTS idx_polling_units_lga_id ON public.polling_units (lga_id);
CREATE INDEX IF NOT EXISTS idx_polling_units_ward_id ON public.polling_units (ward_id);

-- 4. Polling Unit Agents indexes
CREATE INDEX IF NOT EXISTS idx_pu_agents_user_id ON public.polling_unit_agents (user_id);
CREATE INDEX IF NOT EXISTS idx_pu_agents_lga ON public.polling_unit_agents (lga);
CREATE INDEX IF NOT EXISTS idx_pu_agents_ward ON public.polling_unit_agents (ward);
CREATE INDEX IF NOT EXISTS idx_pu_agents_pu_id ON public.polling_unit_agents (polling_unit_id);
CREATE INDEX IF NOT EXISTS idx_pu_agents_councillor_id ON public.polling_unit_agents (councillor_id);
CREATE INDEX IF NOT EXISTS idx_pu_agents_email ON public.polling_unit_agents (email);

-- 5. Councillors indexes
CREATE INDEX IF NOT EXISTS idx_councillors_user_id ON public.councillors (user_id);
CREATE INDEX IF NOT EXISTS idx_councillors_chairman_id ON public.councillors (chairman_id);
CREATE INDEX IF NOT EXISTS idx_councillors_lga ON public.councillors (lga);
CREATE INDEX IF NOT EXISTS idx_councillors_ward ON public.councillors (ward);

-- 6. LGA Chairmen indexes
CREATE INDEX IF NOT EXISTS idx_lga_chairmen_user_id ON public.lga_chairmen (user_id);
CREATE INDEX IF NOT EXISTS idx_lga_chairmen_lga ON public.lga_chairmen (lga);

-- 7. Polling Unit Cells & Cell Members indexes
CREATE INDEX IF NOT EXISTS idx_pu_cells_lga ON public.polling_unit_cells (lga);
CREATE INDEX IF NOT EXISTS idx_pu_cells_ward ON public.polling_unit_cells (ward);
CREATE INDEX IF NOT EXISTS idx_pu_cells_pu_id ON public.polling_unit_cells (polling_unit_id);

CREATE INDEX IF NOT EXISTS idx_cell_members_cell_id ON public.cell_members (cell_id);
CREATE INDEX IF NOT EXISTS idx_cell_members_member_id ON public.cell_members (member_id);
CREATE INDEX IF NOT EXISTS idx_cell_members_pu_id ON public.cell_members (polling_unit_id);

-- 8. Profiles & User Roles indexes
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON public.profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles (phone);

CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);
