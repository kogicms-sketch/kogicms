"use client";
import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Loader2, Image as ImageIcon, Video } from "lucide-react";
import { useActivityMedia } from "@/hooks/useActivityMedia";
import { toast } from "sonner";

interface ActivityMediaUploadProps {
    activityId: string;
}

export const ActivityMediaUpload = ({ activityId }: ActivityMediaUploadProps) => {
    const { uploadMedia } = useActivityMedia(activityId);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const isImage = file.type.startsWith("image/");
        const isVideo = file.type.startsWith("video/");

        if (!isImage && !isVideo) {
            toast.error("Please upload an image or video file.");
            return;
        }

        if (file.size > 50 * 1024 * 1024) { // 50MB limit
            toast.error("File size must be less than 50MB");
            return;
        }

        try {
            setIsUploading(true);
            await uploadMedia.mutateAsync({
                file,
                type: isImage ? "image" : "video",
            });
            // Reset input
            if (fileInputRef.current) fileInputRef.current.value = "";
        } catch (error) {
            console.error(error);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full">
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept="image/*,video/*"
                onChange={handleFileSelect}
                disabled={isUploading}
            />

            <Button
                variant="outline"
                className="w-full border-dashed border-2 h-24 flex flex-col gap-2 hover:bg-muted/50"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? (
                    <>
                        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Uploading...</span>
                    </>
                ) : (
                    <>
                        <Upload className="w-6 h-6 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">Click to upload photos or videos</span>
                    </>
                )}
            </Button>
            <p className="text-xs text-muted-foreground text-center mt-2">
                Max 50MB. Formats: JPG, PNG, MP4, WebM
            </p>
        </div>
    );
};
