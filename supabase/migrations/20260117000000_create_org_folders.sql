-- Create folders table
CREATE TABLE IF NOT EXISTS public.folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    parent_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create org_files table
CREATE TABLE IF NOT EXISTS public.org_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    folder_id UUID REFERENCES public.folders(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE NOT NULL,
    file_type TEXT,
    size BIGINT,
    created_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.org_files ENABLE ROW LEVEL SECURITY;

-- Policies for folders
CREATE POLICY "Org admins can manage folders for their org" ON public.folders
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_admins WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_admins WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can manage all folders" ON public.folders
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Policies for org_files
CREATE POLICY "Org admins can manage files for their org" ON public.org_files
    FOR ALL
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM public.organization_admins WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM public.organization_admins WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Super admins can manage all files" ON public.org_files
    FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );

-- Helper function to create storage bucket if not exists (idempotent)
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('org_documents', 'org_documents', false, false, 52428800, NULL) -- 50MB limit
ON CONFLICT (id) DO NOTHING;

-- Storage Policies
-- Note: 'storage.objects' RLS is tricky because we need to join with our public tables to check permissions.
-- Ideally we encode org_id in the path: org_documents/{org_id}/{file_uuid}

CREATE POLICY "Org admins/Members can SELECT own org files" ON storage.objects
    FOR SELECT
    TO authenticated
    USING (
        bucket_id = 'org_documents' AND
        (storage.foldername(name))[1]::uuid IN (
             SELECT organization_id FROM public.organization_admins WHERE user_id = auth.uid()
             UNION
             SELECT organization_id FROM public.members WHERE email = (SELECT email FROM auth.users WHERE id = auth.uid())
        )
    );

CREATE POLICY "Org admins can INSERT own org files" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'org_documents' AND
        (storage.foldername(name))[1]::uuid IN (
             SELECT organization_id FROM public.organization_admins WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Org admins can DELETE own org files" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'org_documents' AND
        (storage.foldername(name))[1]::uuid IN (
             SELECT organization_id FROM public.organization_admins WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Super admins have full access to org_documents" ON storage.objects
    FOR ALL
    TO authenticated
    USING (
        bucket_id = 'org_documents' AND
        EXISTS (
            SELECT 1 FROM public.user_roles 
            WHERE user_id = auth.uid() AND role = 'super_admin'
        )
    );
