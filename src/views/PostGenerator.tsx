"use client";
import { useState, useEffect } from "react";
import { Sparkles, Copy, Share2, RotateCcw, MessageSquare, Languages, AlignLeft, Palette, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { usePostGenerator, Language, Tone } from "@/hooks/usePostGenerator";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const PostGenerator = () => {
  const [step, setStep] = useState(1);
  const [topic, setTopic] = useState("");
  const [language, setLanguage] = useState<Language>("english");
  const [paragraphs, setParagraphs] = useState([2]);
  const [tone, setTone] = useState<Tone>("inspirational");

  // Local state for editing the generated post
  const [editablePost, setEditablePost] = useState("");

  const { isGenerating, generatedPost, generatePost, reset } = usePostGenerator();

  // Sync generated post to local state when it changes
  useEffect(() => {
    if (generatedPost) {
      setEditablePost(generatedPost);
    }
  }, [generatedPost]);

  const handleGenerate = async () => {
    if (!topic.trim()) return;

    await generatePost({
      topic,
      language,
      paragraphs: paragraphs[0],
      tone
    });
  };

  const handleReset = () => {
    reset();
    setStep(1);
    setTopic("");
    setLanguage("english");
    setParagraphs([2]);
    setTone("inspirational");
    setEditablePost("");
  };

  const handleCopy = async () => {
    if (!editablePost) return;
    try {
      await navigator.clipboard.writeText(editablePost);
      toast.success('Post copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const handleShare = async (platform: 'twitter' | 'facebook' | 'whatsapp') => {
    if (!editablePost) return;
    const encodedPost = encodeURIComponent(editablePost);
    let url = '';
    switch (platform) {
      case 'twitter': url = `https://twitter.com/intent/tweet?text=${encodedPost}`; break;
      case 'facebook': url = `https://www.facebook.com/sharer/sharer.php?quote=${encodedPost}`; break;
      case 'whatsapp': url = `https://wa.me/?text=${encodedPost}`; break;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const canProceed = () => {
    switch (step) {
      case 1: return topic.trim().length > 0;
      case 2: return true;
      case 3: return true;
      case 4: return true;
      default: return false;
    }
  };

  return (
    <div className="space-y-6 pb-20 md:pb-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="h-8 w-8" style={{ color: 'hsl(var(--apc-green))' }} />
          <h1 className="text-2xl md:text-3xl font-bold">AI Post Generator</h1>
        </div>
        <p className="text-muted-foreground text-sm md:text-base">
          Create professional, viral-worthy political posts for Dikko Radda's campaign
        </p>
      </div>

      {!generatedPost ? (
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {step === 1 && <><MessageSquare className="h-5 w-5" /> What topic do you want to write about?</>}
              {step === 2 && <><Languages className="h-5 w-5" /> Choose your language</>}
              {step === 3 && <><AlignLeft className="h-5 w-5" /> How many paragraphs?</>}
              {step === 4 && <><Palette className="h-5 w-5" /> Select the tone</>}
            </CardTitle>
            <CardDescription>
              Step {step} of 4
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Topic */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic / Subject</Label>
                  <Textarea
                    id="topic"
                    placeholder="E.g., Security in Katsina, Development plans, Youth empowerment, Why DR is the best candidate..."
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    rows={4}
                    className="resize-none"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Be specific about what you want the post to focus on. The AI will create compelling content around this topic.
                </p>
              </div>
            )}

            {/* Step 2: Language */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Language</Label>
                  <Select value={language} onValueChange={(v) => setLanguage(v as Language)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hausa">Hausa</SelectItem>
                      <SelectItem value="english">English</SelectItem>
                      <SelectItem value="mixed">Mixed (Hausa & English)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { value: 'hausa', label: 'Hausa', desc: 'Turanci Hausa' },
                    { value: 'english', label: 'English', desc: 'Pure English' },
                    { value: 'mixed', label: 'Mixed', desc: 'Hausa & English' }
                  ].map((lang) => (
                    <button
                      key={lang.value}
                      onClick={() => setLanguage(lang.value as Language)}
                      className={`p-4 rounded-lg border-2 transition-all ${language === lang.value
                          ? 'border-[hsl(var(--apc-green))] bg-[hsl(var(--apc-green)/0.1)]'
                          : 'border-border hover:border-[hsl(var(--apc-green)/0.5)]'
                        }`}
                    >
                      <div className="font-semibold">{lang.label}</div>
                      <div className="text-xs text-muted-foreground">{lang.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Paragraphs */}
            {step === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Number of Paragraphs</Label>
                    <span className="text-2xl font-bold" style={{ color: 'hsl(var(--apc-green))' }}>{paragraphs[0]}</span>
                  </div>
                  <Slider
                    value={paragraphs}
                    onValueChange={setParagraphs}
                    min={1}
                    max={5}
                    step={1}
                    className="py-4"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Short (Twitter)</span>
                    <span>Long (Facebook)</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 4: Tone */}
            {step === 4 && (
              <div className="space-y-4">
                <Label>Select Tone</Label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'inspirational', label: '✨ Inspirational', desc: 'Hopeful and uplifting' },
                    { value: 'informative', label: '📚 Informative', desc: 'Facts and details' },
                    { value: 'call-to-action', label: '📢 Call to Action', desc: 'Mobilize and engage' },
                    { value: 'celebratory', label: '🎉 Celebratory', desc: 'Joyful and triumphant' }
                  ].map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value as Tone)}
                      className={`p-4 rounded-lg border-2 transition-all text-left ${tone === t.value
                          ? 'border-[hsl(var(--apc-green))] bg-[hsl(var(--apc-green)/0.1)]'
                          : 'border-border hover:border-[hsl(var(--apc-green)/0.5)]'
                        }`}
                    >
                      <div className="font-semibold">{t.label}</div>
                      <div className="text-xs text-muted-foreground">{t.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="flex justify-between pt-4">
              <Button
                variant="outline"
                onClick={() => setStep(Math.max(1, step - 1))}
                disabled={step === 1}
              >
                Back
              </Button>

              {step < 4 ? (
                <Button
                  onClick={() => setStep(step + 1)}
                  disabled={!canProceed()}
                  style={{ backgroundColor: 'hsl(var(--apc-green))' }}
                  className="hover:opacity-90"
                >
                  Continue
                </Button>
              ) : (
                <Button
                  onClick={handleGenerate}
                  disabled={isGenerating}
                  style={{ backgroundColor: 'hsl(var(--apc-green))' }}
                  className="hover:opacity-90"
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Post
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        /* Generated Post Display */
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" style={{ color: 'hsl(var(--apc-green))' }} />
              Your Generated Post
            </CardTitle>
            <CardDescription>
              Review, edit, and share your campaign post!
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Textarea
              value={editablePost}
              onChange={(e) => setEditablePost(e.target.value)}
              className="min-h-[300px] text-base leading-relaxed bg-muted/50 resize-y border-[hsl(var(--apc-green)/0.2)] focus:border-[hsl(var(--apc-green))]"
              placeholder="Your generated post will appear here..."
            />

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleCopy} variant="outline" className="flex-1 min-w-[120px]">
                <Copy className="h-4 w-4 mr-2" />
                Copy
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 min-w-[120px]">
                    <Share2 className="h-4 w-4 mr-2" />
                    Share
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => handleShare('twitter')}>
                    Twitter / X
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('facebook')}>
                    Facebook
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => handleShare('whatsapp')}>
                    WhatsApp
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button onClick={handleGenerate} disabled={isGenerating} variant="outline" className="flex-1 min-w-[120px]">
                {isGenerating ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RotateCcw className="h-4 w-4 mr-2" />
                )}
                Regenerate
              </Button>
            </div>

            <Button onClick={handleReset} variant="ghost" className="w-full">
              Create New Post
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Summary when generating */}
      {isGenerating && (
        <div className="max-w-2xl mx-auto text-center space-y-4 py-8">
          <Loader2 className="h-12 w-12 animate-spin mx-auto" style={{ color: 'hsl(var(--apc-green))' }} />
          <p className="text-muted-foreground">
            Creating a powerful post about <span className="font-semibold text-foreground">{topic}</span>...
          </p>
          <p className="text-xs text-muted-foreground">
            Our AI is analyzing social media trends and crafting the perfect message
          </p>
        </div>
      )}
    </div>
  );
};

export default PostGenerator;
