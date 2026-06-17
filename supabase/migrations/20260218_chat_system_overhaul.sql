-- ============================================================
-- CHAT SYSTEM OVERHAUL MIGRATION
-- Creates role-based group channels + private DM support
-- ============================================================

-- 1. Ensure channels table has a description column
ALTER TABLE public.channels ADD COLUMN IF NOT EXISTS description text;

-- 2. Ensure channels table has a channel_type column for group vs dm
-- The existing 'type' column is used as text, we'll keep using it
-- Values: 'general' (group for everyone), 'group' (role-restricted group), 'dm' (private 1-on-1)

-- 3. Drop old RLS policies on channels and messages (clean slate)
DROP POLICY IF EXISTS "Allow authenticated users to read channels" ON public.channels;
DROP POLICY IF EXISTS "Allow authenticated users to insert channels" ON public.channels;
DROP POLICY IF EXISTS "Allow authenticated users to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow authenticated users to insert messages" ON public.messages;
DROP POLICY IF EXISTS "Users can read channels they are members of" ON public.channels;
DROP POLICY IF EXISTS "Users can read messages in their channels" ON public.messages;
DROP POLICY IF EXISTS "Users can insert messages in their channels" ON public.messages;
DROP POLICY IF EXISTS "Allow all authenticated to read channels" ON public.channels;
DROP POLICY IF EXISTS "Allow all authenticated to read messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all authenticated to send messages" ON public.messages;
DROP POLICY IF EXISTS "Allow all authenticated to join channels" ON public.channel_members;
DROP POLICY IF EXISTS "Users can read their channel memberships" ON public.channel_members;
DROP POLICY IF EXISTS "Users can join channels" ON public.channel_members;

-- 4. Enable RLS on all chat tables
ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_members ENABLE ROW LEVEL SECURITY;

-- 5. RLS: channel_members
-- Users can see their own memberships
CREATE POLICY "Users can read their own channel memberships"
ON public.channel_members FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Users can insert themselves as members
CREATE POLICY "Users can join channels"
ON public.channel_members FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Super admin can manage all memberships
CREATE POLICY "Super admin can manage all memberships"
ON public.channel_members FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'super_admin'
  )
);

-- 6. RLS: channels
-- Users can see channels they are members of
CREATE POLICY "Users can read their channels"
ON public.channels FOR SELECT
TO authenticated
USING (
  id IN (
    SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
  )
);

-- Authenticated users can create channels (for DMs)
CREATE POLICY "Authenticated users can create channels"
ON public.channels FOR INSERT
TO authenticated
WITH CHECK (true);

-- 7. RLS: messages
-- Users can read messages in channels they belong to
CREATE POLICY "Users can read messages in their channels"
ON public.messages FOR SELECT
TO authenticated
USING (
  channel_id IN (
    SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
  )
);

-- Users can send messages to channels they belong to
CREATE POLICY "Users can send messages to their channels"
ON public.messages FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND channel_id IN (
    SELECT channel_id FROM public.channel_members WHERE user_id = auth.uid()
  )
);

-- ============================================================
-- 8. RPC: get_or_create_dm_channel
-- Creates or finds a private DM channel between current user and another user
-- Returns the channel record
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_dm_channel(other_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid := auth.uid();
  channel_name text;
  existing_channel_id uuid;
  new_channel_id uuid;
  result json;
BEGIN
  -- Ensure we're not DMing ourselves
  IF current_user_id = other_user_id THEN
    RAISE EXCEPTION 'Cannot create DM with yourself';
  END IF;

  -- Canonical channel name: sorted UUIDs to ensure uniqueness
  IF current_user_id < other_user_id THEN
    channel_name := 'dm-' || current_user_id::text || '-' || other_user_id::text;
  ELSE
    channel_name := 'dm-' || other_user_id::text || '-' || current_user_id::text;
  END IF;

  -- Check if channel already exists
  SELECT id INTO existing_channel_id
  FROM public.channels
  WHERE name = channel_name AND type = 'dm'
  LIMIT 1;

  IF existing_channel_id IS NOT NULL THEN
    -- Ensure both users are members
    INSERT INTO public.channel_members (channel_id, user_id)
    VALUES (existing_channel_id, current_user_id)
    ON CONFLICT DO NOTHING;

    INSERT INTO public.channel_members (channel_id, user_id)
    VALUES (existing_channel_id, other_user_id)
    ON CONFLICT DO NOTHING;

    SELECT row_to_json(c) INTO result
    FROM public.channels c
    WHERE c.id = existing_channel_id;

    RETURN result;
  END IF;

  -- Create new DM channel
  INSERT INTO public.channels (name, type, created_by)
  VALUES (channel_name, 'dm', current_user_id)
  RETURNING id INTO new_channel_id;

  -- Add both users as members
  INSERT INTO public.channel_members (channel_id, user_id)
  VALUES (new_channel_id, current_user_id)
  ON CONFLICT DO NOTHING;

  INSERT INTO public.channel_members (channel_id, user_id)
  VALUES (new_channel_id, other_user_id)
  ON CONFLICT DO NOTHING;

  SELECT row_to_json(c) INTO result
  FROM public.channels c
  WHERE c.id = new_channel_id;

  RETURN result;
END;
$$;

-- ============================================================
-- 9. RPC: get_or_create_channel (keep for backward compat)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_or_create_channel(_name text, _type text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  existing_id uuid;
  new_id uuid;
  result json;
BEGIN
  SELECT id INTO existing_id FROM public.channels WHERE name = _name LIMIT 1;

  IF existing_id IS NOT NULL THEN
    SELECT row_to_json(c) INTO result FROM public.channels c WHERE c.id = existing_id;
    RETURN result;
  END IF;

  INSERT INTO public.channels (name, type, created_by)
  VALUES (_name, _type, auth.uid())
  RETURNING id INTO new_id;

  SELECT row_to_json(c) INTO result FROM public.channels c WHERE c.id = new_id;
  RETURN result;
END;
$$;

-- ============================================================
-- 10. Seed the 4 group channels
-- ============================================================
DO $$
DECLARE
  general_id uuid;
  chairmen_id uuid;
  councillors_id uuid;
  agents_id uuid;
BEGIN
  -- General channel (all users)
  INSERT INTO public.channels (name, type, description)
  VALUES ('General Chat', 'general', 'Open channel for all users')
  ON CONFLICT DO NOTHING;

  SELECT id INTO general_id FROM public.channels WHERE name = 'General Chat' LIMIT 1;

  -- LGA Chairmen group
  INSERT INTO public.channels (name, type, description)
  VALUES ('LGA Chairmen', 'group', 'Private group for all LGA Chairmen')
  ON CONFLICT DO NOTHING;

  SELECT id INTO chairmen_id FROM public.channels WHERE name = 'LGA Chairmen' LIMIT 1;

  -- Ward Councillors group
  INSERT INTO public.channels (name, type, description)
  VALUES ('Ward Councillors', 'group', 'Private group for all Ward Councillors')
  ON CONFLICT DO NOTHING;

  SELECT id INTO councillors_id FROM public.channels WHERE name = 'Ward Councillors' LIMIT 1;

  -- Polling Unit Agents group
  INSERT INTO public.channels (name, type, description)
  VALUES ('Polling Unit Agents', 'group', 'Private group for all Polling Unit Agents')
  ON CONFLICT DO NOTHING;

  SELECT id INTO agents_id FROM public.channels WHERE name = 'Polling Unit Agents' LIMIT 1;

  -- Add ALL existing authenticated users to General Chat
  INSERT INTO public.channel_members (channel_id, user_id)
  SELECT general_id, p.id
  FROM public.profiles p
  WHERE p.id IS NOT NULL
  ON CONFLICT DO NOTHING;

  -- Add LGA Chairmen to their group
  IF chairmen_id IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id)
    SELECT chairmen_id, p.id
    FROM public.profiles p
    WHERE p.role = 'lga_chairman'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add Councillors to their group
  IF councillors_id IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id)
    SELECT councillors_id, p.id
    FROM public.profiles p
    WHERE p.role = 'councillor'
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add Polling Unit Agents (members with polling_unit_id) to their group
  IF agents_id IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id)
    SELECT agents_id, p.id
    FROM public.profiles p
    WHERE p.role = 'member' AND p.polling_unit_id IS NOT NULL
    ON CONFLICT DO NOTHING;
  END IF;

END $$;

-- ============================================================
-- 11. Trigger: auto-add new users to appropriate channels on profile upsert
-- ============================================================
CREATE OR REPLACE FUNCTION public.auto_add_user_to_channels()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  general_id uuid;
  chairmen_id uuid;
  councillors_id uuid;
  agents_id uuid;
BEGIN
  -- Get channel IDs
  SELECT id INTO general_id FROM public.channels WHERE name = 'General Chat' LIMIT 1;
  SELECT id INTO chairmen_id FROM public.channels WHERE name = 'LGA Chairmen' LIMIT 1;
  SELECT id INTO councillors_id FROM public.channels WHERE name = 'Ward Councillors' LIMIT 1;
  SELECT id INTO agents_id FROM public.channels WHERE name = 'Polling Unit Agents' LIMIT 1;

  -- Always add to General Chat
  IF general_id IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id)
    VALUES (general_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  -- Add to role-specific group
  IF NEW.role = 'lga_chairman' AND chairmen_id IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id)
    VALUES (chairmen_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.role = 'councillor' AND councillors_id IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id)
    VALUES (councillors_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  IF NEW.role = 'member' AND NEW.polling_unit_id IS NOT NULL AND agents_id IS NOT NULL THEN
    INSERT INTO public.channel_members (channel_id, user_id)
    VALUES (agents_id, NEW.id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN NEW;
END;
$$;

-- Drop old trigger if exists
DROP TRIGGER IF EXISTS on_profile_upsert_add_to_channels ON public.profiles;

-- Create trigger on profiles INSERT and UPDATE
CREATE TRIGGER on_profile_upsert_add_to_channels
AFTER INSERT OR UPDATE OF role, polling_unit_id ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.auto_add_user_to_channels();

-- ============================================================
-- 12. RPC: get_dm_partner_info
-- Given a DM channel name (dm-uuid1-uuid2), returns the other user's profile
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_dm_partner_info(channel_id_param uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  partner_id uuid;
  result json;
BEGIN
  -- Find the other member of this DM channel
  SELECT cm.user_id INTO partner_id
  FROM public.channel_members cm
  WHERE cm.channel_id = channel_id_param
    AND cm.user_id != auth.uid()
  LIMIT 1;

  IF partner_id IS NULL THEN
    RETURN NULL;
  END IF;

  SELECT row_to_json(p) INTO result
  FROM public.profiles p
  WHERE p.id = partner_id;

  RETURN result;
END;
$$;

-- ============================================================
-- 13. RPC: get_all_users_for_dm
-- Returns all profiles (except current user) for the DM picker
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_all_users_for_dm()
RETURNS TABLE(id uuid, full_name text, role text, avatar_url text, lga_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.full_name,
    p.role::text,
    p.avatar_url,
    p.lga_id
  FROM public.profiles p
  WHERE p.id != auth.uid()
    AND p.full_name IS NOT NULL
  ORDER BY p.full_name;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_or_create_dm_channel(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_or_create_channel(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_dm_partner_info(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_all_users_for_dm() TO authenticated;
