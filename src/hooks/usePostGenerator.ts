import { useState } from 'react';
import { toast } from 'sonner';
import { campaignPosts } from '@/data/campaignPosts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/loose-client';
import { useParty } from '@/contexts/PartyContext';

export type Language = 'english' | 'pidgin' | 'grassroots';
export type Tone = 'inspirational' | 'informative' | 'call-to-action' | 'celebratory';

interface GenerateParams {
  topic: string;
  language: Language;
  paragraphs: number;
  tone: Tone;
  model?: string;
}

export const usePostGenerator = () => {
  const { user, role, organizationId } = useAuth();
  const { partyId } = useParty();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePost = async (params: GenerateParams) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedPost(null);

    try {
      const isApm = partyId === "apm";
      let supportGroupContext = "";
      let candidateContext = isApm
        ? "Allied Peoples' Movement (APM) Kogi State Leadership - Nigeria First"
        : "Local Government Administration and Grassroots development";
      let roleContext = "";
      let locationContext = "";

      if (user) {
        // Fetch user profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role, lga, ward")
          .eq("id", user.id)
          .maybeSingle();

        const lgaName = profile?.lga || "Kogi State";
        locationContext = `LGA: ${lgaName}, Ward: ${profile?.ward || "General"}`;

        if (organizationId) {
          const { data: org } = await supabase
            .from("support_groups")
            .select("name, mandate, race, candidate_id")
            .eq("id", organizationId)
            .maybeSingle();

          if (org) {
            supportGroupContext = `${org.name} (Mandate: ${org.mandate || "Community Mobilization"})`;
            if (org.candidate_id) {
              const raceLabel = org.race ? org.race.toUpperCase() : "ELECTION";
              const { data: candidateProfile } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", org.candidate_id)
                .maybeSingle();

              if (candidateProfile) {
                candidateContext = `${candidateProfile.full_name} (Candidate for ${raceLabel}) - APM Kogi`;
              } else {
                candidateContext = `${lgaName} Local Government Candidate (Candidate for ${raceLabel})`;
              }
            } else {
              candidateContext = `${lgaName} Local Government Campaign`;
            }
          }
        } else if (role === "lga_chairman") {
          roleContext = `You are writing as the LGA Chairman ${profile?.full_name || ""} for ${lgaName}. Highlight local accomplishments of the ${lgaName} Local Government under APM.`;
        } else if (role === "councillor") {
          roleContext = `You are writing as the Councillor ${profile?.full_name || ""} for Ward: ${profile?.ward || ""}, LGA: ${lgaName}. Focus on grassroots development of the ${lgaName} Local Government.`;
        } else if (role === "senatorial_leader") {
          roleContext = `You are writing as a Senatorial Leader. Focus on Senatorial district level achievements and APM community initiatives.`;
        } else if (role === "federal_rep") {
          roleContext = `You are writing as a Federal Representative. Focus on federal constituency achievements and local government initiatives.`;
        } else if (role === "house_assembly_member") {
          roleContext = `You are writing as a State House of Assembly Member. Focus on constituency achievements and APM development initiatives.`;
        }
      }

      // Configuration for OpenRouter API
      const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "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";
      const MODEL = params.model || "google/gemini-2.5-flash";

      const systemPrompt = isApm
        ? `You are an expert Nigerian political content writer and social media strategist specializing in creating viral, compelling political posts. You are writing content to support the Allied Peoples' Movement (APM) campaign in Kogi State under the banner "Nigeria First".
      
      TARGET CANDIDATE / LEADERSHIP: ${candidateContext}
      USER ROLE/CONTEXT: ${roleContext}
      LOCATION CONTEXT: ${locationContext}
      SUPPORT GROUP INFO: ${supportGroupContext}
      
      ABOUT ALLIED PEOPLES' MOVEMENT (APM) - KOGI STATE:
      - Official Motto / Slogan: "Nigeria First"
      - Party Emblem / Symbol: Cassava (signifying agricultural wealth, food security, and self-reliance)
      - Key Pillars: Grassroots development, youth employment, modern education, quality healthcare in all 239 wards, infrastructural connectivity across Kogi Central, Kogi East, and Kogi West
      
      TRENDING POST STRUCTURE (MUST FOLLOW THIS EXACT FORMAT):
      1. **Attention-Grabbing Hook**: Powerful, emotional, or dramatic opening line using relevant emojis (🇳🇬, 🌾, ⚡, ✊).
      2. **The Story / The Proof**: 1-2 punchy paragraphs or bullet points highlighting concrete community development, economic growth, and youth opportunities in Kogi State.
      3. **Call-to-Action (CTA)**: Inspiring closing asking citizens to rally behind APM (e.g. "Look for the Cassava on the ballot!", "Nigeria First, Kogi First!").
      4. **Hashtags**: End with 4-6 trending hashtags: #NigeriaFirst #APMKogi #KogiState #KogiDecides #AlliedPeoplesMovement.`
        : `You are an expert Nigerian content writer and social media strategist specializing in creating viral, compelling posts. You are writing content to support local government administration and development initiatives in Kogi State.
      
      TARGET: ${candidateContext}
      USER ROLE/CONTEXT: ${roleContext}
      LOCATION CONTEXT: ${locationContext}
      SUPPORT GROUP INFO: ${supportGroupContext}
      
      ABOUT THE LOCAL GOVERNMENT INITIATIVES:
      - Committed to the progress of the local communities
      - Known for transparency, service delivery, and local empowerment
      - Focuses on primary healthcare, basic education, local infrastructure, and local economic growth
      
      TRENDING POST STRUCTURE (MUST FOLLOW THIS EXACT FORMAT):
      1. **Attention-Grabbing Hook**: Start with a powerful, emotional, or dramatic opening line using relevant emojis to stop users from scrolling.
      2. **The Story / The Proof**: Bullet points or 1-2 punchy paragraphs showing concrete local achievements, progress, or development. Make it relatable, using local Nigerian/LGA context.
      3. **Alignment**: Mention the support group "${supportGroupContext ? supportGroupContext : 'our team'}" and clearly state support for the local government.
      4. **Inspirational Call-to-Action (CTA)**: A powerful, action-oriented closing line (e.g. "Let's keep the local progress going!", "Share this if you stand for community development!").
      5. **Trending Emojis & Emojis of Pride**: Use 2-3 well-placed emojis (e.g. ✊, 🇳🇬, 📈, ✨) to look modern and human.
      6. **Hashtags**: End with 4-6 highly relevant, trending campaign hashtags (e.g. #${(locationContext.match(/LGA:\s*(\w+)/)?.[1] || "Kogi").replace(/\s+/g, "")}Campaign, #LocalDevelopment, #GrassrootsProgress).`;

      const languageInstructions = {
        'english': 'Write entirely in Standard English. Use clear, polished, and professional tone suitable for official public and digital audiences.',
        'pidgin': 'Write in Nigerian Pidgin English as spoken casually and powerfully across Nigerian communities. Keep it lively, relatable, and authentic to grassroots workers, market traders, and youths.',
        'grassroots': 'Write in simple, inspiring Grassroots English. Direct, punchy, accessible, and community-centered.'
      };

      const toneInstructions = {
        'inspirational': 'Be uplifting and hopeful. Focus on the bright future ahead with APM.',
        'informative': 'Be factual and educational. Share specific information about achievements and plans.',
        'call-to-action': 'Be urgent and mobilizing. Push people to take action - share, mobilize, and vote APM.',
        'celebratory': 'Be joyful and triumphant. Celebrate achievements and community milestones.'
      };

      const userPrompt = `Create a powerful, viral-worthy political social media post about: "${params.topic}"

STRICT PARAGRAPH COUNT REQUIREMENT:
- The body of the generated post MUST consist of EXACTLY ${params.paragraphs} paragraph(s).
- Do NOT output more than ${params.paragraphs} paragraph(s) of text.
- If ${params.paragraphs} is 1, combine the attention-grabbing hook, the proof/story, and the call-to-action into a single, cohesive paragraph. Do not use blank lines or newlines between them.

REQUIREMENTS:
- Language: ${languageInstructions[params.language] || languageInstructions['english']}
- Tone: ${toneInstructions[params.tone] || toneInstructions['inspirational']}
- Include 4-6 relevant hashtags at the end (appended to the paragraph or immediately after on a single line)
- Add 2-3 appropriate emojis throughout
- Make it shareable, viral, and engaging
- End with a powerful statement or call to action

The post should be so compelling that it will trend on social media and inspire people to share it widely. Write like the best political strategist in Nigeria - every word should count!`;

      // Construct the payload for OpenRouter
      const prompt = `${systemPrompt}\n\nTask:\n${userPrompt}`;

      console.log(`Attempting to generate with OpenRouter (${MODEL})...`);

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`,
          'HTTP-Referer': typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
          'X-Title': 'KogiCMS'
        },
        body: JSON.stringify({
          model: MODEL,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.8,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Status ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.choices?.[0]?.message?.content;

      if (!generatedText) {
        throw new Error('No content generated from OpenRouter AI');
      }

      setGeneratedPost(generatedText);
      toast.success('Post generated successfully!');

    } catch (err) {
      console.error('Generation failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate post';

      // Fallback logic
      console.warn('OpenRouter AI failed, falling back to mock data');

      const posts = campaignPosts[params.language] || campaignPosts['english'];
      const topicLower = params.topic.toLowerCase();
      const matchingPosts = posts.filter(post => {
        const postLower = post.toLowerCase();
        const keywords = topicLower.split(' ').filter(w => w.length > 3);
        return keywords.some(k => postLower.includes(k));
      });
      const pool = matchingPosts.length > 0 ? matchingPosts : posts;
      let finalPost = pool[Math.floor(Math.random() * pool.length)] || campaignPosts['english'][0];

      setGeneratedPost(finalPost);
      toast.error(`OpenRouter Error: ${message}`);
      toast.info('Using offline simulation mode.');
      setError(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const copyToClipboard = async () => {
    if (!generatedPost) return;

    try {
      await navigator.clipboard.writeText(generatedPost);
      toast.success('Post copied to clipboard!');
    } catch {
      toast.error('Failed to copy');
    }
  };

  const sharePost = async (platform: 'twitter' | 'facebook' | 'whatsapp') => {
    if (!generatedPost) return;

    const encodedPost = encodeURIComponent(generatedPost);
    let url = '';

    switch (platform) {
      case 'twitter':
        url = `https://twitter.com/intent/tweet?text=${encodedPost}`;
        break;
      case 'facebook':
        url = `https://www.facebook.com/sharer/sharer.php?quote=${encodedPost}`;
        break;
      case 'whatsapp':
        url = `https://wa.me/?text=${encodedPost}`;
        break;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const reset = () => {
    setGeneratedPost(null);
    setError(null);
  };

  return {
    isGenerating,
    generatedPost,
    error,
    generatePost,
    copyToClipboard,
    sharePost,
    reset
  };
};
