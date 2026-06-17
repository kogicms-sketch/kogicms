"use client";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLogSupportGroupActivity } from "@/hooks/useSupportGroups";
import { Loader2, Upload, Camera, Video, FileText, Film, FileUp, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/loose-client";

const formSchema = z.object({
  title: z.string().min(3, "Title is required"),
  activity_type: z.string().min(1, "Please select activity type"),
  description: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  lga: z.string().optional(),
  ward: z.string().optional(),
  activity_date: z.string().min(1, "Date is required"),
  attendance_count: z.string().optional(),
  impact_notes: z.string().optional(),
  media_reach: z.string().optional(),
  media_links: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const ACTIVITY_TYPES = [
  { value: "town_hall", label: "Town Hall" },
  { value: "door_to_door", label: "Door-to-Door Outreach" },
  { value: "rally", label: "Rally / Campaign Event" },
  { value: "charity_drive", label: "Charity Drive" },
  { value: "meeting", label: "Meeting" },
  { value: "other", label: "Other Activity" },
];

interface ActivityLogFormProps {
  supportGroupId: string;
  onSuccess?: () => void;
}

export const ActivityLogForm = ({ supportGroupId, onSuccess }: ActivityLogFormProps) => {
  const logActivity = useLogSupportGroupActivity();
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Photos state
  const [photos, setPhotos] = useState<File[]>([]);
  const [uploadedPhotoUrls, setUploadedPhotoUrls] = useState<string[]>([]);
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);

  // Videos state
  const [videos, setVideos] = useState<File[]>([]);
  const [uploadedVideoUrls, setUploadedVideoUrls] = useState<string[]>([]);
  const [isVideoUploading, setIsVideoUploading] = useState(false);

  // Attendance sheets / logs state
  const [attendanceFiles, setAttendanceFiles] = useState<File[]>([]);
  const [uploadedAttendanceUrls, setUploadedAttendanceUrls] = useState<string[]>([]);
  const [isAttendanceUploading, setIsAttendanceUploading] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      activity_date: new Date().toISOString().split("T")[0],
      attendance_count: "0",
    },
  });

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newPhotos = Array.from(files);
    setPhotos(prev => [...prev, ...newPhotos]);

    setIsPhotoUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of newPhotos) {
        const fileName = `activities/${supportGroupId}/photos/${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from("campaign-assets")
          .upload(fileName, file, {
            contentType: file.type,
            upsert: true,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("campaign-assets")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setUploadedPhotoUrls(prev => [...prev, ...uploadedUrls]);
      toast.success(`${newPhotos.length} photo(s) uploaded`);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Failed to upload photos");
    } finally {
      setIsPhotoUploading(false);
    }
  };

  const handleVideoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newVideos = Array.from(files);
    setVideos(prev => [...prev, ...newVideos]);

    setIsVideoUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of newVideos) {
        const fileName = `activities/${supportGroupId}/videos/${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from("campaign-assets")
          .upload(fileName, file, {
            contentType: file.type,
            upsert: true,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("campaign-assets")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setUploadedVideoUrls(prev => [...prev, ...uploadedUrls]);
      toast.success(`${newVideos.length} video(s) uploaded`);
    } catch (error) {
      console.error("Video upload error:", error);
      toast.error("Failed to upload videos");
    } finally {
      setIsVideoUploading(false);
    }
  };

  const handleAttendanceUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    const newFiles = Array.from(files);
    setAttendanceFiles(prev => [...prev, ...newFiles]);

    setIsAttendanceUploading(true);
    try {
      const uploadedUrls: string[] = [];

      for (const file of newFiles) {
        const fileName = `activities/${supportGroupId}/attendance/${Date.now()}-${file.name}`;
        
        const { data, error } = await supabase.storage
          .from("campaign-assets")
          .upload(fileName, file, {
            contentType: file.type,
            upsert: true,
          });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from("campaign-assets")
          .getPublicUrl(fileName);

        uploadedUrls.push(publicUrl);
      }

      setUploadedAttendanceUrls(prev => [...prev, ...uploadedUrls]);
      toast.success(`${newFiles.length} attendance log(s) uploaded`);
    } catch (error) {
      console.error("Attendance upload error:", error);
      toast.error("Failed to upload attendance logs");
    } finally {
      setIsAttendanceUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setUploadedPhotoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeVideo = (index: number) => {
    setVideos(prev => prev.filter((_, i) => i !== index));
    setUploadedVideoUrls(prev => prev.filter((_, i) => i !== index));
  };

  const removeAttendance = (index: number) => {
    setAttendanceFiles(prev => prev.filter((_, i) => i !== index));
    setUploadedAttendanceUrls(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await logActivity.mutateAsync({
        support_group_id: supportGroupId,
        title: data.title,
        activity_type: data.activity_type,
        description: data.description,
        location: data.location,
        lga: data.lga,
        ward: data.ward,
        activity_date: data.activity_date,
        attendance_count: parseInt(data.attendance_count || "0"),
        impact_notes: data.impact_notes,
        media_reach: parseInt(data.media_reach || "0"),
        media_links: data.media_links ? data.media_links.split(',').map(l => l.trim()) : [],
        photos: uploadedPhotoUrls,
        videos: uploadedVideoUrls,
        attendance_logs: uploadedAttendanceUrls,
      });
      onSuccess?.();
    } catch (error) {
      console.error("Error logging activity:", error);
      toast.error("Failed to log activity");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Activity Title *</FormLabel>
              <FormControl>
                <Input placeholder="e.g., Weekly Strategy Meeting" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="activity_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Activity Type *</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {ACTIVITY_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="activity_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe what happened during this activity..."
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location *</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Central Mosque, Funtua" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="attendance_count"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Attendance Count</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="impact_notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Impact & Outcomes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What was achieved? Any notable outcomes?"
                  className="min-h-[80px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="media_reach"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estimated Media Reach</FormLabel>
                <FormControl>
                  <Input type="number" placeholder="0" {...field} />
                </FormControl>
                <FormDescription>Estimated number of people reached</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="media_links"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Media Links</FormLabel>
                <FormControl>
                  <Input placeholder="facebook.com/post, twitter.com/post" {...field} />
                </FormControl>
                <FormDescription>Comma separated URLs</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        {/* Proof of Activity Uploads */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t">
          {/* Photo Upload */}
          <div className="space-y-4">
            <FormLabel className="font-semibold text-foreground flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-500" />
              Event Photos (Required)
            </FormLabel>
            <div className="border-2 border-dashed border-border hover:border-emerald-500/50 hover:bg-emerald-500/[0.02] transition-all rounded-lg p-4 text-center">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                id="photo-upload"
              />
              <label
                htmlFor="photo-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Camera className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs font-medium text-muted-foreground">
                  Upload photos
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  PNG, JPG up to 5MB
                </span>
              </label>
            </div>

            {isPhotoUploading && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading...
              </div>
            )}

            {photos.length > 0 && (
              <div className="grid grid-cols-3 gap-1.5 max-h-24 overflow-y-auto pr-1">
                {photos.map((photo, index) => (
                  <div key={index} className="relative aspect-square rounded-md bg-muted overflow-hidden border">
                    <img
                      src={URL.createObjectURL(photo)}
                      alt={`Photo ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => removePhoto(index)}
                      className="absolute top-0.5 right-0.5 w-4.5 h-4.5 bg-red-500/90 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                      style={{ fontSize: "10px", width: "16px", height: "16px" }}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Video Upload */}
          <div className="space-y-4">
            <FormLabel className="font-semibold text-foreground flex items-center gap-1.5">
              <Video className="w-4 h-4 text-blue-500" />
              Event Videos
            </FormLabel>
            <div className="border-2 border-dashed border-border hover:border-blue-500/50 hover:bg-blue-500/[0.02] transition-all rounded-lg p-4 text-center">
              <input
                type="file"
                accept="video/*"
                multiple
                onChange={handleVideoUpload}
                className="hidden"
                id="video-upload"
              />
              <label
                htmlFor="video-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <Video className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs font-medium text-muted-foreground">
                  Upload videos
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  MP4, MOV up to 20MB
                </span>
              </label>
            </div>

            {isVideoUploading && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading...
              </div>
            )}

            {videos.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {videos.map((video, index) => (
                  <div key={index} className="flex items-center justify-between p-1.5 rounded-md border bg-muted/30 text-[11px] gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      <Film className="w-3 h-3 text-blue-500 shrink-0" />
                      <span className="truncate font-medium">{video.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeVideo(index)}
                      className="p-0.5 hover:bg-muted rounded text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Attendance Log Upload */}
          <div className="space-y-4">
            <FormLabel className="font-semibold text-foreground flex items-center gap-1.5">
              <FileUp className="w-4 h-4 text-orange-500" />
              Attendance Sheets
            </FormLabel>
            <div className="border-2 border-dashed border-border hover:border-orange-500/50 hover:bg-orange-500/[0.02] transition-all rounded-lg p-4 text-center">
              <input
                type="file"
                accept=".pdf,.csv,.xls,.xlsx,.doc,.docx,image/*"
                multiple
                onChange={handleAttendanceUpload}
                className="hidden"
                id="attendance-upload"
              />
              <label
                htmlFor="attendance-upload"
                className="cursor-pointer flex flex-col items-center"
              >
                <FileUp className="w-6 h-6 text-muted-foreground mb-1" />
                <span className="text-xs font-medium text-muted-foreground">
                  Upload logs
                </span>
                <span className="text-[10px] text-muted-foreground mt-0.5">
                  PDF, Excel, Word, Images
                </span>
              </label>
            </div>

            {isAttendanceUploading && (
              <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Uploading...
              </div>
            )}

            {attendanceFiles.length > 0 && (
              <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                {attendanceFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-1.5 rounded-md border bg-muted/30 text-[11px] gap-2">
                    <div className="flex items-center gap-1 min-w-0">
                      <FileText className="w-3 h-3 text-orange-500 shrink-0" />
                      <span className="truncate font-medium">{file.name}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeAttendance(index)}
                      className="p-0.5 hover:bg-muted rounded text-red-500"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
          <Button type="button" variant="outline" onClick={onSuccess}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            className="btn-action"
            disabled={isSubmitting || isPhotoUploading || isVideoUploading || isAttendanceUploading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Logging...
              </>
            ) : (
              "Log Activity"
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};
