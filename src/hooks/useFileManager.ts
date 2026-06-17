import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/loose-client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

export interface Folder {
    id: string;
    name: string;
    parent_id: string | null;
    organization_id: string;
    created_at: string;
}

export interface OrgFile {
    id: string;
    name: string;
    storage_path: string;
    folder_id: string | null;
    organization_id: string;
    file_type: string;
    size: number;
    created_at: string;
    url?: string; // Signed URL for viewing
}

export const useFileManager = (organizationId: string | null) => {
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [files, setFiles] = useState<OrgFile[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [breadcrumbs, setBreadcrumbs] = useState<Folder[]>([]);

    const fetchContents = async (folderId: string | null) => {
        if (!organizationId) return;
        setLoading(true);
        try {
            // Fetch folders
            let folderQuery = supabase
                .from("folders")
                .select("*")
                .eq("organization_id", organizationId)
                .order("name");

            if (folderId) {
                folderQuery = folderQuery.eq("parent_id", folderId);
            } else {
                folderQuery = folderQuery.is("parent_id", null);
            }

            const { data: folderData, error: folderError } = await folderQuery;
            if (folderError) throw folderError;

            // Fetch files
            let fileQuery = supabase
                .from("org_files")
                .select("*")
                .eq("organization_id", organizationId)
                .order("name");

            if (folderId) {
                fileQuery = fileQuery.eq("folder_id", folderId);
            } else {
                fileQuery = fileQuery.is("folder_id", null);
            }

            const { data: fileData, error: fileError } = await fileQuery;
            if (fileError) throw fileError;

            setFolders(folderData || []);
            setFiles(fileData || []);
        } catch (error) {
            console.error("Error fetching contents:", error);
            toast.error("Failed to load contents");
        } finally {
            setLoading(false);
        }
    };

    const updateBreadcrumbs = async (folderId: string | null) => {
        if (!folderId) {
            setBreadcrumbs([]);
            return;
        }
        // Recursive fetch for breadcrumbs is expensive, simplified approach:
        // For now, just fetching current folder's parent chain might be needed.
        // Let's rely on a helper or just fetching the current folder and its parent for now?
        // Actually, let's just fetch all folders (if count is low) or trace back.
        // Optimization: We can store breadcrumb path in state when navigating DOWN.
        // But navigating UP or Refresh needs fetch.

        // Simple fetch of the current folder to get its name and parent
        try {
            const { data, error } = await supabase.from("folders").select("*").eq("id", folderId).single();
            if (data) {
                // This is a simplified BFS/recursion if we want full path. 
                // For MVP, handling 1 level or relying on prev state + current fetch?
                // Let's implement full path trace for correctness.
                const path: Folder[] = [data];
                let current = data;
                while (current.parent_id) {
                    const { data: parent } = await supabase.from("folders").select("*").eq("id", current.parent_id).single();
                    if (parent) {
                        path.unshift(parent);
                        current = parent;
                    } else {
                        break;
                    }
                }
                setBreadcrumbs(path);
            }
        } catch (e) {
            console.error("Error building breadcrumbs", e);
        }
    };

    useEffect(() => {
        if (organizationId) {
            fetchContents(currentFolderId);
            updateBreadcrumbs(currentFolderId);
        }
    }, [organizationId, currentFolderId]);

    const createFolder = async (name: string) => {
        if (!organizationId) return;
        try {
            const { error } = await supabase.from("folders").insert({
                name,
                parent_id: currentFolderId,
                organization_id: organizationId,
            });

            if (error) throw error;
            toast.success("Folder created");
            fetchContents(currentFolderId);
        } catch (error) {
            console.error("Error creating folder:", error);
            toast.error("Failed to create folder");
        }
    };

    const uploadFile = async (file: File) => {
        if (!organizationId) return;
        setUploading(true);
        try {
            const fileExt = file.name.split('.').pop();
            const uuid = crypto.randomUUID();
            const storagePath = `${organizationId}/${uuid}`; // Secure path: org_id/random_id

            // 1. Upload to Storage
            const { error: uploadError } = await supabase.storage
                .from("org_documents")
                .upload(storagePath, file);

            if (uploadError) throw uploadError;

            // 2. Create DB Record
            const { error: dbError } = await supabase.from("org_files").insert({
                name: file.name,
                storage_path: storagePath,
                folder_id: currentFolderId,
                organization_id: organizationId,
                file_type: file.type,
                size: file.size,
            });

            if (dbError) throw dbError; // Note: if DB fails, we might have an orphan file. Setup a cron to clean later?

            toast.success("File uploaded");
            fetchContents(currentFolderId);
        } catch (error) {
            console.error("Error uploading file:", error);
            toast.error("Failed to upload file");
        } finally {
            setUploading(false);
        }
    };

    const getFileUrl = async (path: string) => {
        const { data } = await supabase.storage.from("org_documents").createSignedUrl(path, 3600); // 1 hour
        return data?.signedUrl;
    };

    return {
        folders,
        files,
        loading,
        uploading,
        currentFolderId,
        breadcrumbs,
        setCurrentFolderId,
        createFolder,
        uploadFile,
        getFileUrl
    };
};
