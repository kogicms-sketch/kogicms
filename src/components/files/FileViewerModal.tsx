"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { OrgFile } from "@/hooks/useFileManager";
import { useEffect, useState } from "react";
import { Loader2, Download } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface FileViewerModalProps {
    file: OrgFile | null;
    isOpen: boolean;
    onClose: () => void;
    getFileUrl: (path: string) => Promise<string | undefined>;
}

export const FileViewerModal = ({ file, isOpen, onClose, getFileUrl }: FileViewerModalProps) => {
    const [url, setUrl] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const { role } = useAuth(); // Assume role is available from context

    useEffect(() => {
        if (isOpen && file) {
            setLoading(true);
            getFileUrl(file.storage_path).then((signedUrl) => {
                setUrl(signedUrl || null);
                setLoading(false);
            });
        } else {
            setUrl(null);
        }
    }, [isOpen, file, getFileUrl]);

    if (!file) return null;

    const isImage = file.file_type.startsWith("image/");
    const isVideo = file.file_type.startsWith("video/");

    // Security: Prevent context menu
    const handleContextMenu = (e: React.MouseEvent) => {
        e.preventDefault();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl w-full h-[80vh] flex flex-col p-0 overflow-hidden bg-black/90 text-white border-0">
                <div className="flex justify-between items-center p-4 bg-black/50 z-10">
                    <h3 className="font-semibold truncate">{file.name}</h3>
                    {role === "super_admin" && url && (
                        <a
                            href={url}
                            download={file.name}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={async () => {
                                if ((window as any).ipcRenderer) {
                                    try {
                                        await (window as any).ipcRenderer.invoke('set-allow-downloads', true);
                                    } catch (err) {
                                        console.error("Failed to set download permission", err);
                                    }
                                }
                            }}
                        >
                            <Button size="sm" variant="secondary">
                                <Download className="mr-2 h-4 w-4" /> Download
                            </Button>
                        </a>
                    )}
                </div>

                <div
                    className="flex-1 flex items-center justify-center relative bg-black"
                    onContextMenu={handleContextMenu}
                >
                    {/* Invisible overlay to capture drags/clicks if needed */}
                    <div className="absolute inset-0 z-20 bg-transparent" aria-hidden="true" onContextMenu={handleContextMenu}></div>

                    {loading ? (
                        <Loader2 className="h-10 w-10 animate-spin text-white" />
                    ) : (
                        <div className="relative z-10 w-full h-full flex items-center justify-center pointer-events-none select-none">
                            {/* 
                    pointer-events-none on the media itself prevents right click -> save as, 
                    but we need controls for video? 
                    If we use pointer-events-none on video, user can't play it.
                    We should keep it interactive but block context menu on the WRAPPER.
                    React Event bubbling handles it.
                 */}

                            {isImage && url && (
                                <img
                                    src={url}
                                    alt={file.name}
                                    className="max-h-full max-w-full object-contain select-none pointer-events-auto"
                                    onContextMenu={(e) => e.preventDefault()}
                                    draggable={false}
                                />
                            )}
                            {isVideo && url && (
                                <video
                                    src={url}
                                    controls
                                    controlsList="nodownload" // HTML5 attribute to hide download button
                                    className="max-h-full max-w-full object-contain select-none pointer-events-auto"
                                    onContextMenu={(e) => e.preventDefault()}
                                    disablePictureInPicture
                                />
                            )}
                            {!isImage && !isVideo && (
                                <div className="text-center p-4">
                                    <p>Preview not available for this file type.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
};
