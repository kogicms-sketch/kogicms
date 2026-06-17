"use client";
import { Folder as FolderIcon, FileText, Image, Video, Music, File } from "lucide-react";
import { Folder, OrgFile } from "@/hooks/useFileManager";
import { format } from "date-fns";

interface FolderGridProps {
    folders: Folder[];
    files: OrgFile[];
    onFolderClick: (folderId: string) => void;
    onFileClick: (file: OrgFile) => void;
}

export const FolderGrid = ({ folders, files, onFolderClick, onFileClick }: FolderGridProps) => {
    const getFileIcon = (type: string) => {
        if (type.startsWith("image/")) return <Image className="h-10 w-10 text-blue-500" />;
        if (type.startsWith("video/")) return <Video className="h-10 w-10 text-red-500" />;
        if (type.startsWith("audio/")) return <Music className="h-10 w-10 text-yellow-500" />;
        return <FileText className="h-10 w-10 text-gray-500" />;
    };

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {/* Folders */}
            {folders.map((folder) => (
                <div
                    key={folder.id}
                    className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onDoubleClick={() => onFolderClick(folder.id)}
                >
                    <FolderIcon className="h-12 w-12 text-yellow-400 fill-yellow-100 mb-2" />
                    <span className="text-sm font-medium text-center truncate w-full">{folder.name}</span>
                    <span className="text-xs text-gray-400 mt-1">{format(new Date(folder.created_at), "MMM d, yyyy")}</span>
                </div>
            ))}

            {/* Files */}
            {files.map((file) => (
                <div
                    key={file.id}
                    className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => onFileClick(file)}
                >
                    {getFileIcon(file.file_type)}
                    <span className="text-sm font-medium text-center truncate w-full mt-2">{file.name}</span>
                    <span className="text-xs text-gray-400 mt-1">{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
            ))}

            {folders.length === 0 && files.length === 0 && (
                <div className="col-span-full py-12 text-center text-gray-500">
                    This folder is empty.
                </div>
            )}
        </div>
    );
};
