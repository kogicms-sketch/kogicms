"use client";
import { useState } from "react";
import DashboardLayout from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Share2, 
  MessageSquare, 
  Trophy, 
  FileText, 
  Users, 
  Sparkles,
  Copy,
  CheckCircle2,
  TrendingUp
} from "lucide-react";
import { 
  useDailyTalkingPoints, 
  useShareTalkingPoint,
  formatTalkingPointForShare,
  shareToWhatsApp,
  shareToTwitter,
  shareToFacebook,
  CATEGORY_LABELS,
} from "@/hooks/useTalkingPoints";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const ICONS: Record<string, React.ElementType> = {
  MessageSquare,
  Trophy,
  FileText,
  Users,
};

const TalkingPoints = () => {
  const { role } = useAuth();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  
  const { data: talkingPoints, isLoading } = useDailyTalkingPoints();
  const shareMutation = useShareTalkingPoint();

  const filteredPoints = activeCategory === "all" 
    ? talkingPoints 
    : talkingPoints?.filter(tp => tp.category === activeCategory);

  const handleShare = async (platform: string, talkingPoint: any) => {
    const content = formatTalkingPointForShare(talkingPoint);
    
    // Record the share
    await shareMutation.mutateAsync({
      talkingPointId: talkingPoint.id,
      platform,
    });

    // Open share dialog
    switch (platform) {
      case "whatsapp":
        shareToWhatsApp(content);
        break;
      case "twitter":
        shareToTwitter(content);
        break;
      case "facebook":
        shareToFacebook(content);
        break;
      case "copy":
        await navigator.clipboard.writeText(content);
        setCopiedId(talkingPoint.id);
        toast.success("Copied to clipboard!");
        setTimeout(() => setCopiedId(null), 2000);
        break;
    }
  };

  const getCategoryIcon = (category: string) => {
    const iconName = CATEGORY_LABELS[category as keyof typeof CATEGORY_LABELS]?.icon;
    return ICONS[iconName] || MessageSquare;
  };

  return (
    <DashboardLayout
      title="Talking Points"
      subtitle="Daily campaign ammunition for social media warriors"
    >
      {/* Header Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="kpi-card-accent">
          <CardHeader className="pb-2">
            <CardTitle className="text-white/70 text-sm">Today's Points</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{talkingPoints?.length || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Total Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-[hsl(var(--apc-green))]">
              {talkingPoints?.reduce((acc, tp) => acc + (tp.share_count || 0), 0) || 0}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Your Shares</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm">Impact</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-green-500" />
              <span className="text-lg font-semibold">Growing</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Filter */}
      <Tabs value={activeCategory} onValueChange={setActiveCategory} className="mb-6">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="all">All Points</TabsTrigger>
          {Object.entries(CATEGORY_LABELS).map(([key, config]) => (
            <TabsTrigger key={key} value={key}>
              {config.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Talking Points Feed */}
      {isLoading ? (
        <div className="text-center py-12">Loading talking points...</div>
      ) : filteredPoints?.length === 0 ? (
        <Card className="p-12 text-center">
          <Sparkles className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Talking Points Yet</h3>
          <p className="text-muted-foreground">
            Check back later for today's campaign ammunition!
          </p>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPoints?.map((point) => {
            const CategoryIcon = getCategoryIcon(point.category);
            const categoryConfig = CATEGORY_LABELS[point.category as keyof typeof CATEGORY_LABELS];
            
            return (
              <Card key={point.id} className="overflow-hidden">
                <CardHeader className={`${(categoryConfig as any)?.bgColor || "bg-muted"} pb-4`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full ${categoryConfig?.color || "bg-gray-500"} bg-opacity-20 flex items-center justify-center`}>
                        <CategoryIcon className={`w-5 h-5 ${categoryConfig?.color || "text-gray-500"}`} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg">{point.title}</CardTitle>
                          <Badge className={(categoryConfig as any)?.bgColor || "bg-gray-100"}>
                            {categoryConfig?.label || point.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Posted {new Date(point.publish_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Share2 className="w-4 h-4" />
                      {point.share_count || 0} shares
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent className="p-6">
                  {/* Content */}
                  <div className="prose max-w-none mb-6">
                    {point.summary ? (
                      <p className="text-lg leading-relaxed">{point.summary}</p>
                    ) : (
                      <p className="text-lg leading-relaxed">{point.content}</p>
                    )}
                  </div>

                  {/* Image if present */}
                  {point.image_url && (
                    <div className="mb-6">
                      <img 
                        src={point.image_url} 
                        alt={point.title}
                        className="rounded-lg max-h-64 object-cover w-full"
                      />
                    </div>
                  )}

                  {/* Hashtags */}
                  {point.hashtags && point.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-6">
                      {point.hashtags.map((tag, idx) => (
                        <Badge key={idx} variant="secondary">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Share Buttons */}
                  <div className="flex flex-wrap gap-2 pt-4 border-t">
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => handleShare("whatsapp", point)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      WhatsApp
                    </Button>
                    <Button
                      size="sm"
                      className="bg-sky-500 hover:bg-sky-600"
                      onClick={() => handleShare("twitter", point)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Twitter
                    </Button>
                    <Button
                      size="sm"
                      className="bg-blue-600 hover:bg-blue-700"
                      onClick={() => handleShare("facebook", point)}
                    >
                      <Share2 className="w-4 h-4 mr-2" />
                      Facebook
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleShare("copy", point)}
                    >
                      {copiedId === point.id ? (
                        <>
                          <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" />
                          Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default TalkingPoints;
