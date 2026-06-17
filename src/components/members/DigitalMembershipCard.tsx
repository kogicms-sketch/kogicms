"use client";
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Share2, 
  CheckCircle2,
  Sparkles,
  Loader2
} from "lucide-react";
import { toPng, toJpeg } from "html-to-image";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/loose-client";
import { MemberWithOrganization } from "@/hooks/useMembers";
import QRCode from "react-qr-code";
import { getPositionLabel } from "@/hooks/useMyStructure";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface DigitalMembershipCardProps {
  member: MemberWithOrganization;
  campaignName?: string;
  onCardGenerated?: (url: string) => void;
}

export const DigitalMembershipCard = ({
  member,
  campaignName = "Dikko Radda Campaign",
  onCardGenerated,
}: DigitalMembershipCardProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedUrl, setGeneratedUrl] = useState<string | null>(member.digital_card_url);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const initials = member.full_name
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const generateCard = useCallback(async () => {
    if (!cardRef.current) return;

    setIsGenerating(true);
    try {
      // Generate high-quality PNG
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
        cacheBust: true,
      });

      // Upload to Supabase Storage
      const fileName = `member-cards/${member.id}-${Date.now()}.png`;
      const blob = await fetch(dataUrl).then(res => res.blob());
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("campaign-assets")
        .upload(fileName, blob, {
          contentType: "image/png",
          upsert: true,
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("campaign-assets")
        .getPublicUrl(fileName);

      // Update member record
      const { error: updateError } = await supabase
        .from("members")
        .update({
          digital_card_url: publicUrl,
          card_generated_at: new Date().toISOString(),
        })
        .eq("id", member.id);

      if (updateError) throw updateError;

      setGeneratedUrl(publicUrl);
      onCardGenerated?.(publicUrl);
      toast.success("Digital membership card generated!");
    } catch (error) {
      console.error("Error generating card:", error);
      toast.error("Failed to generate card");
    } finally {
      setIsGenerating(false);
    }
  }, [member, onCardGenerated]);

  const downloadCard = useCallback(async () => {
    if (!cardRef.current) return;

    try {
      const dataUrl = await toPng(cardRef.current, {
        quality: 1,
        pixelRatio: 3,
      });

      const link = document.createElement("a");
      link.download = `DR-Membership-${member.full_name.replace(/\s+/g, "-")}.png`;
      link.href = dataUrl;
      link.click();

      toast.success("Card downloaded!");
    } catch (error) {
      console.error("Error downloading card:", error);
      toast.error("Failed to download card");
    }
  }, [member]);

  const shareToWhatsApp = () => {
    const message = encodeURIComponent(
      `🇳🇬 I'm a proud member of ${campaignName}!\n\n` +
      `Name: ${member.full_name}\n` +
      `Member ID: ${member.membership_id}\n` +
      `Position: ${getPositionLabel(member.political_position || "member")}\n\n` +
      `Join the movement for a better Katsina! #DR2027 #DikkoRadda`
    );
    window.open(`https://wa.me/?text=${message}`, "_blank");
  };

  const shareToFacebook = () => {
    const url = encodeURIComponent(generatedUrl || window.location.href);
    window.open(
      `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      "_blank"
    );
  };

  const shareToTwitter = () => {
    const text = encodeURIComponent(
      `🇳🇬 Proud to be part of ${campaignName}! ` +
      `Together we're building a better Katsina. ` +
      `#DR2027 #DikkoRadda #KatsinaFirst`
    );
    window.open(`https://twitter.com/intent/tweet?text=${text}`, "_blank");
  };

  const copyCardLink = async () => {
    if (generatedUrl) {
      await navigator.clipboard.writeText(generatedUrl);
      toast.success("Card link copied to clipboard!");
    }
  };

  return (
    <div className="space-y-4">
      {/* Card Preview */}
      <div className="flex justify-center">
        <div
          ref={cardRef}
          className="w-[400px] bg-gradient-to-br from-[hsl(var(--navy-deep))] via-[hsl(var(--navy-medium))] to-[hsl(var(--navy-light))] rounded-2xl overflow-hidden shadow-2xl"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {/* Header */}
          <div className="bg-[hsl(var(--apc-green))] p-4 text-center relative overflow-hidden">
            <div className="absolute inset-0 opacity-20">
              <div className="absolute top-0 left-0 w-full h-full bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMiIgY3k9IjIiIHI9IjIiIGZpbGw9IndoaXRlIi8+PC9zdmc+')] opacity-30" />
            </div>
            <h2 className="text-white font-bold text-lg relative z-10 tracking-wider">
              {campaignName}
            </h2>
            <p className="text-white/80 text-xs relative z-10">Official Digital Membership</p>
          </div>

          {/* Main Content */}
          <div className="p-6 flex flex-col items-center">
            {/* Profile Image / Avatar */}
            <div className="w-24 h-24 rounded-full bg-white border-4 border-[hsl(var(--apc-green))] flex items-center justify-center mb-4 shadow-lg">
              <span className="text-3xl font-bold text-[hsl(var(--navy-deep))]">
                {initials}
              </span>
            </div>

            {/* Member Name */}
            <h3 className="text-white font-bold text-xl text-center mb-1">
              {member.full_name}
            </h3>

            {/* Member ID */}
            <Badge className="bg-white/10 text-white border-white/20 mb-3 font-mono">
              {member.membership_id}
            </Badge>

            {/* Position Badge */}
            {member.political_position && (
              <Badge className="bg-[hsl(var(--apc-green))] text-white mb-4">
                {getPositionLabel(member.political_position)}
              </Badge>
            )}

            {/* Member Details */}
            <div className="w-full space-y-2 mb-4">
              {member.lga && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">LGA:</span>
                  <span className="text-white font-medium">{member.lga}</span>
                </div>
              )}
              {member.ward && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Ward:</span>
                  <span className="text-white font-medium">{member.ward}</span>
                </div>
              )}
              {(member as any).support_group?.name && (
                <div className="flex justify-between text-sm">
                  <span className="text-white/60">Group:</span>
                  <span className="text-white font-medium truncate max-w-[150px]">
                    {(member as any).support_group.name}
                  </span>
                </div>
              )}
            </div>

            {/* QR Code */}
            <div className="bg-white p-2 rounded-lg mb-3">
              <QRCode
                value={`DR-MEMBER-${member.id}`}
                size={100}
                level="M"
              />
            </div>
            <p className="text-white/50 text-xs text-center">
              Scan to verify membership
            </p>
          </div>

          {/* Footer */}
          <div className="bg-black/20 p-3 text-center">
            <p className="text-white/60 text-xs">
              © 2027 Dikko Radda Campaign
            </p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 justify-center">
        {!generatedUrl && (
          <Button
            onClick={generateCard}
            disabled={isGenerating}
            className="bg-[hsl(var(--apc-green))] hover:opacity-90"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Digital Card
              </>
            )}
          </Button>
        )}

        <Button onClick={downloadCard} variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Download
        </Button>

        <Dialog open={isShareDialogOpen} onOpenChange={setIsShareDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">
              <Share2 className="w-4 h-4 mr-2" />
              Share
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Share Your Membership</DialogTitle>
              <DialogDescription>
                Spread the word! Share your membership with your network.
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <Button
                onClick={shareToWhatsApp}
                className="bg-green-600 hover:bg-green-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
              <Button
                onClick={shareToFacebook}
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Facebook
              </Button>
              <Button
                onClick={shareToTwitter}
                className="bg-sky-500 hover:bg-sky-600"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Twitter
              </Button>
              <Button
                onClick={copyCardLink}
                variant="outline"
                disabled={!generatedUrl}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {generatedUrl && (
        <p className="text-center text-sm text-muted-foreground">
          <CheckCircle2 className="w-4 h-4 inline mr-1 text-green-500" />
          Card generated and saved to your profile
        </p>
      )}
    </div>
  );
};
