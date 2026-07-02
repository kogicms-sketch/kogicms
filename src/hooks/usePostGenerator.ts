import { useState } from 'react';
import { toast } from 'sonner';
import { campaignPosts } from '@/data/campaignPosts';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/loose-client';
import { useParty } from '@/contexts/PartyContext';

export type Language = 'hausa' | 'english' | 'mixed';
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
      // 1. Determine context based on the logged-in user's role and details
      const isApc = partyId === "apc";
      let supportGroupContext = "";
      let candidateContext = isApc 
        ? "Dikko Umar Radda (Governor of Katsina State)"
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

        if (profile) {
          if (profile.lga) locationContext += ` LGA: ${profile.lga}`;
          if (profile.ward) locationContext += `, Ward: ${profile.ward}`;
        }

        const lgaName = profile?.lga || "Katsina State";

        // If user is a support group admin (org_admin), load organization and aligned candidate info
        if (role === "org_admin" && organizationId) {
          const { data: org } = await supabase
            .from("organizations")
            .select("name, candidate_race, candidate_id, senatorial_zone, federal_constituency")
            .eq("id", organizationId)
            .maybeSingle();

          if (org) {
            supportGroupContext = `This post is issued by the support group: "${org.name}".`;
            if (org.candidate_race) {
              let raceLabel = org.candidate_race;
              if (org.candidate_race === 'senatorial') raceLabel = `Senatorial candidate (${org.senatorial_zone || 'Katsina'})`;
              else if (org.candidate_race === 'house_of_reps') raceLabel = `House of Representatives candidate (${org.federal_constituency || 'Katsina'})`;
              else if (org.candidate_race === 'state_assembly') raceLabel = `State Assembly candidate (${profile?.lga || 'Katsina'})`;
              else if (org.candidate_race === 'lga_chairman') raceLabel = `LGA Chairman candidate (${profile?.lga || 'Katsina'})`;
              
              if (org.candidate_id) {
                // Fetch candidate's name from profiles
                const { data: candidateProfile } = await supabase
                  .from("profiles")
                  .select("full_name")
                  .eq("id", org.candidate_id)
                  .maybeSingle();

                if (candidateProfile) {
                  candidateContext = isApc
                    ? `${candidateProfile.full_name} (Candidate for ${raceLabel}) along with Governor Dikko Umar Radda`
                    : `${lgaName} Local Government Candidate (Candidate for ${raceLabel})`;
                } else {
                  candidateContext = isApc
                    ? `Candidate for ${raceLabel} along with Governor Dikko Umar Radda`
                    : `${lgaName} Local Government Candidate (Candidate for ${raceLabel})`;
                }
              } else {
                candidateContext = isApc
                  ? `Governor Dikko Umar Radda (Governorship candidate)`
                  : `${lgaName} Local Government Campaign`;
              }
            }
          }
        } else if (role === "lga_chairman") {
          roleContext = isApc
            ? `You are writing as the LGA Chairman ${profile?.full_name || ""} for ${lgaName}. Highlight local accomplishments while campaigning for Governor Dikko Umar Radda.`
            : `You are writing as the LGA Chairman ${profile?.full_name || ""} for ${lgaName}. Highlight local accomplishments of the ${lgaName} Local Government.`;
        } else if (role === "councillor") {
          roleContext = isApc
            ? `You are writing as the Councillor ${profile?.full_name || ""} for Ward: ${profile?.ward || ""}, LGA: ${lgaName}. Focus on grassroots development and Governor Dikko Umar Radda.`
            : `You are writing as the Councillor ${profile?.full_name || ""} for Ward: ${profile?.ward || ""}, LGA: ${lgaName}. Focus on grassroots development of the ${lgaName} Local Government.`;
        } else if (role === "senatorial_leader") {
          roleContext = isApc
            ? `You are writing as a Senatorial Leader. Focus on Senatorial district level achievements and Governor Dikko Umar Radda.`
            : `You are writing as a Senatorial Leader. Focus on Senatorial district level achievements and local government initiatives.`;
        } else if (role === "federal_rep") {
          roleContext = isApc
            ? `You are writing as a Federal Representative. Focus on federal constituency achievements and Governor Dikko Umar Radda.`
            : `You are writing as a Federal Representative. Focus on federal constituency achievements and local government initiatives.`;
        } else if (role === "house_assembly_member") {
          roleContext = isApc
            ? `You are writing as a State House of Assembly Member. Focus on constituency achievements and Governor Dikko Umar Radda.`
            : `You are writing as a State House of Assembly Member. Focus on constituency achievements and local government initiatives.`;
        }
      }

      // Configuration for OpenRouter API
      const API_KEY = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY || "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";
      const MODEL = params.model || "google/gemini-2.5-flash";

      const systemPrompt = isApc 
        ? `You are an expert Nigerian political content writer and social media strategist specializing in creating viral, compelling political posts. You are writing content to support the campaign of Dikko Umar Radda (Governor of Katsina State) and aligned candidates.
      
      TARGET CANDIDATE: ${candidateContext}
      USER ROLE/CONTEXT: ${roleContext}
      LOCATION CONTEXT: ${locationContext}
      SUPPORT GROUP INFO: ${supportGroupContext}
      
      ABOUT DIKKO UMAR RADDA:
      - Current Governor of Katsina State
      - A true son of Katsina State, dedicated to its progress
      - Known for his integrity, discipline, and commitment to development
      - Focuses on security, grassroots empowerment, educational reform, and agricultural growth
      
      TRENDING POST STRUCTURE (MUST FOLLOW THIS EXACT FORMAT):
      1. **Attention-Grabbing Hook**: Start with a powerful, emotional, or dramatic opening line (e.g., a rhetorical question, a bold declaration, or a high-impact statement) using relevant emojis to stop users from scrolling.
      2. **The Story / The Proof**: Bullet points or 1-2 punchy paragraphs showing concrete achievements, progress, or development. Make it relatable, using local Nigerian/Katsina context (e.g. security improvements, agricultural support, water projects, road building).
      3. **Candidate & Support Group Alignment**: Mention the support group "${supportGroupContext ? supportGroupContext : 'our team'}" and clearly state support for the candidate (${candidateContext}).
      4. **Inspirational Call-to-Action (CTA)**: A powerful, action-oriented closing line (e.g. "Let's keep the progress going!", "Share this if you stand for development!", "Join us in securing Katsina's future!").
      5. **Trending Emojis & Emojis of Pride**: Use 2-3 well-placed emojis (e.g. ✊, 🇳🇬, 📈, ✨, 🟢) to look modern and human.
      6. **Hashtags**: End with 4-6 highly relevant, trending campaign hashtags (e.g. #DR2027, #DikkoRadda, #KatsinaDecides, #ProgressFirst, #KatsinaFirst, and local constituencies/support group tags).
      
      IMPORTANT: Make every post feel authentic, passionate, and grassroots-driven. Avoid generic AI fluff or robotic language.`
        : `You are an expert Nigerian content writer and social media strategist specializing in creating viral, compelling posts. You are writing content to support the local government administration and development initiatives.
      
      TARGET: ${candidateContext}
      USER ROLE/CONTEXT: ${roleContext}
      LOCATION CONTEXT: ${locationContext}
      SUPPORT GROUP INFO: ${supportGroupContext}
      
      ABOUT THE LOCAL GOVERNMENT INITIATIVES:
      - Committed to the progress of the local communities
      - Known for transparency, service delivery, and local empowerment
      - Focuses on primary healthcare, basic education, local infrastructure, and local economic growth
      
      TRENDING POST STRUCTURE (MUST FOLLOW THIS EXACT FORMAT):
      1. **Attention-Grabbing Hook**: Start with a powerful, emotional, or dramatic opening line (e.g., a rhetorical question, a bold declaration, or a high-impact statement) using relevant emojis to stop users from scrolling.
      2. **The Story / The Proof**: Bullet points or 1-2 punchy paragraphs showing concrete local achievements, progress, or development. Make it relatable, using local Nigerian/LGA context.
      3. **Alignment**: Mention the support group "${supportGroupContext ? supportGroupContext : 'our team'}" and clearly state support for the local government.
      4. **Inspirational Call-to-Action (CTA)**: A powerful, action-oriented closing line (e.g. "Let's keep the local progress going!", "Share this if you stand for community development!").
      5. **Trending Emojis & Emojis of Pride**: Use 2-3 well-placed emojis (e.g. ✊, 🇳🇬, 📈, ✨) to look modern and human.
      6. **Hashtags**: End with 4-6 highly relevant, trending campaign hashtags (e.g. #${(locationContext.match(/LGA:\s*(\w+)/)?.[1] || "Katsina").replace(/\s+/g, "")}Campaign, #LocalDevelopment, #GrassrootsProgress, and local constituencies/support group tags).`;

      const languageInstructions = {
        'hausa': 'Write entirely in Hausa language. Use proper Hausa grammar, Hausa slogans, and expressions.',
        'english': 'Write entirely in English language.',
        'mixed': isApc 
          ? 'Write in a natural blend of Hausa and English (code-switching/Enghausa) as used by youths and political supporters in Katsina on social media. Do not just translate words in parentheses. Instead, write sentences that naturally switch between English and Hausa, e.g., combining English with Hausa phrases like "Gaskiya ne", "Domin cigaban jihar Katsina", "Sai Dikko Radda", "Allah ya ba da nasara", "Mun gode", "Mu hada hannu tare", "Aiki sai ya yi aiki" throughout the text naturally.'
          : `Write in a natural blend of Hausa and English (code-switching/Enghausa) as used by youths and supporters in Katsina on social media. Do not just translate words in parentheses. Instead, write sentences that naturally switch between English and Hausa, e.g., combining English with Hausa phrases like "Gaskiya ne", "Domin cigaban jihar Katsina", "Allah ya ba da nasara", "Mun gode", "Mu hada hannu tare", "Aiki sai ya yi aiki" throughout the text naturally.`
      };

      const toneInstructions = {
        'inspirational': isApc 
          ? 'Be uplifting and hopeful. Focus on the bright future ahead with Dikko Radda.'
          : 'Be uplifting and hopeful. Focus on the bright future ahead of our communities.',
        'informative': 'Be factual and educational. Share specific information about achievements and plans.',
        'call-to-action': 'Be urgent and mobilizing. Push people to take action - share and support local development.',
        'celebratory': 'Be joyful and triumphant. Celebrate achievements and milestones.'
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
          'X-Title': 'DikkoCMS'
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

      if (!isApc) {
        const lgaName = locationContext.match(/LGA:\s*([^,]+)/)?.[1] || "Katsina State";
        finalPost = finalPost
          .replace(/Dikko Umar Radda/gi, `${lgaName} Local Government`)
          .replace(/Dikko Radda/gi, `${lgaName} Local Government`)
          .replace(/Dikko/gi, `${lgaName} LG`)
          .replace(/Radda/gi, "")
          .replace(/#DR2027/gi, `#${lgaName.replace(/\s+/g, "")}Campaign`)
          .replace(/#DikkoRadda/gi, `#${lgaName.replace(/\s+/g, "")}Campaign`)
          .replace(/Sai Dikko/gi, `Sai ${lgaName} LG`);
      }

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
