ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS kpi_score integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS social_media_score integer DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.support_group_donations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    support_group_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    amount numeric NOT NULL,
    type text NOT NULL CHECK (type IN ('inflow', 'expenditure')),
    source text NOT NULL,
    date date NOT NULL,
    notes text,
    logged_by uuid REFERENCES auth.users(id),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.support_group_donations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view donations for their organizations" ON public.support_group_donations;
CREATE POLICY "Users can view donations for their organizations" 
ON public.support_group_donations FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.organization_admins 
        WHERE organization_admins.organization_id = support_group_donations.support_group_id 
        AND organization_admins.user_id = auth.uid()
    ) OR 
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'super_admin'
);

DROP POLICY IF EXISTS "Users can insert donations for their organizations" ON public.support_group_donations;
CREATE POLICY "Users can insert donations for their organizations" 
ON public.support_group_donations FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.organization_admins 
        WHERE organization_admins.organization_id = support_group_donations.support_group_id 
        AND organization_admins.user_id = auth.uid()
    ) OR 
    (SELECT role FROM public.user_roles WHERE user_id = auth.uid()) = 'super_admin'
);

CREATE OR REPLACE FUNCTION public.update_organization_kpi()
RETURNS trigger AS $$
DECLARE
  org_id uuid;
  total_kpi integer := 0;
  activities_score integer := 0;
  pvc_score integer := 0;
BEGIN
  IF TG_TABLE_NAME = 'members' THEN
    IF TG_OP = 'DELETE' THEN
      org_id := OLD.organization_id;
    ELSE
      org_id := NEW.organization_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'support_group_activities' THEN
    IF TG_OP = 'DELETE' THEN
      org_id := OLD.support_group_id;
    ELSE
      org_id := NEW.support_group_id;
    END IF;
  END IF;

  IF org_id IS NOT NULL THEN
    -- Calculate activities score (10 pts per verified activity)
    SELECT count(*) * 10 INTO activities_score 
    FROM public.support_group_activities 
    WHERE support_group_id = org_id AND verified_at IS NOT NULL;
    
    -- Calculate PVC score (1 pt per member with voters card)
    SELECT count(*) INTO pvc_score 
    FROM public.members 
    WHERE organization_id = org_id AND voters_card_id IS NOT NULL AND voters_card_id != '';
    
    total_kpi := activities_score + pvc_score;
    
    UPDATE public.organizations 
    SET kpi_score = total_kpi 
    WHERE id = org_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS tr_update_kpi_on_member ON public.members;
CREATE TRIGGER tr_update_kpi_on_member
AFTER INSERT OR UPDATE OF voters_card_id, organization_id OR DELETE ON public.members
FOR EACH ROW EXECUTE FUNCTION public.update_organization_kpi();

DROP TRIGGER IF EXISTS tr_update_kpi_on_activity ON public.support_group_activities;
CREATE TRIGGER tr_update_kpi_on_activity
AFTER INSERT OR UPDATE OF verified_at, support_group_id OR DELETE ON public.support_group_activities
FOR EACH ROW EXECUTE FUNCTION public.update_organization_kpi();

UPDATE public.organizations o
SET kpi_score = (
    COALESCE((SELECT count(*) * 10 FROM public.support_group_activities a WHERE a.support_group_id = o.id AND a.verified_at IS NOT NULL), 0) +
    COALESCE((SELECT count(*) FROM public.members m WHERE m.organization_id = o.id AND m.voters_card_id IS NOT NULL AND m.voters_card_id != ''), 0)
);
