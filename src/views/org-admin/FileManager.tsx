"use client";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useFileManager } from "@/hooks/useFileManager";
import { FolderGrid } from "@/components/files/FolderGrid";
import { FileViewerModal } from "@/components/files/FileViewerModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { ChevronRight, FolderPlus, Upload, Home, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const FileManager = () => {
    const { organizationId } = useAuth();
    const {
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
    } = useFileManager(organizationId);

    const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const [selectedFile, setSelectedFile] = useState<any>(null); // Using any for now to avoid complexity, but usually OrgFile
    const [isViewerOpen, setIsViewerOpen] = useState(false);

    const handleCreateFolder = async () => {
        if (!newFolderName.trim()) return;
        await createFolder(newFolderName);
        setNewFolderName("");
        setIsNewFolderOpen(false);
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            uploadFile(file);
        }
    };

    const handleFileClick = (file: any) => {
        setSelectedFile(file);
        setIsViewerOpen(true);
    };

    return (
        <div className="p-6 h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center pb-4 border-b">
                <h1 className="text-2xl font-bold tracking-tight">Organization Files</h1>
                <div className="flex items-center gap-2">
                    <Dialog open={isNewFolderOpen} onOpenChange={setIsNewFolderOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline"><FolderPlus className="mr-2 h-4 w-4" /> New Folder</Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Folder</DialogTitle>
                            </DialogHeader>
                            <div className="flex gap-2 mt-4">
                                <Input
                                    placeholder="Folder Name"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                />
                                <Button onClick={handleCreateFolder}>Create</Button>
                            </div>
                        </DialogContent>
                    </Dialog>

                    <div className="relative">
                        <input
                            type="file"
                            id="file-upload"
                            className="hidden"
                            onChange={handleFileUpload}
                            disabled={uploading}
                        />
                        <Button asChild disabled={uploading}>
                            <label htmlFor="file-upload" className="cursor-pointer">
                                {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                                Upload
                            </label>
                        </Button>
                    </div>
                </div>
            </div>

            {/* Breadcrumbs */}
            <div className="flex items-center text-sm text-gray-500 mb-4 overflow-x-auto whitespace-nowrap">
                <button
                    onClick={() => setCurrentFolderId(null)}
                    className="hover:text-primary flex items-center"
                >
                    <Home className="h-4 w-4 mr-1" /> Home
                </button>
                {breadcrumbs.map((folder) => (
                    <div key={folder.id} className="flex items-center">
                        <ChevronRight className="h-4 w-4 mx-1" />
                        <button
                            onClick={() => setCurrentFolderId(folder.id)}
                            className="hover:text-primary font-medium"
                        >
                            {folder.name}
                        </button>
                    </div>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
            ) : (
                <FolderGrid
                    folders={folders}
                    files={files}
                    onFolderClick={setCurrentFolderId}
                    onFileClick={handleFileClick}
                />
            )}

            <FileViewerModal
                file={selectedFile}
                isOpen={isViewerOpen}
                onClose={() => setIsViewerOpen(false)}
                getFileUrl={getFileUrl}
            />
        </div>
    );
};

export default FileManager;
