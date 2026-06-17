import { useState } from 'react';
import { toast } from 'sonner';
import { campaignPosts } from '@/data/campaignPosts';

export type Language = 'hausa' | 'english' | 'mixed';
export type Tone = 'inspirational' | 'informative' | 'call-to-action' | 'celebratory';

interface GenerateParams {
  topic: string;
  language: Language;
  paragraphs: number;
  tone: Tone;
}

export const usePostGenerator = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPost, setGeneratedPost] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generatePost = async (params: GenerateParams) => {
    setIsGenerating(true);
    setError(null);
    setGeneratedPost(null);

    try {
      // Configuration for Google Gemini API (Free Tier)
      const API_KEY = "AIzaSyCTJaceaL33sYkngAjI3Yd650ZPoQlCclU";
      const MODEL = "gemini-pro";

      const systemPrompt = `You are an expert Nigerian political content writer and social media strategist specializing in creating viral, compelling political posts. You are writing content to support Dikko Umar Radda, the Governor of Katsina State, who is seeking re-election.
      
      ABOUT DIKKO UMAR RADDA:
      - Current Governor of Katsina State
      - A true son of Katsina State, dedicated to its progress
      - Known for his integrity, discipline, and commitment to development
      - Experienced administrator and leader
      - Focused on development, security, and progress for Katsina State
      - Has demonstrated the capacity to bring development and improve the lives of citizens
      
      YOUR WRITING STYLE:
      1. Write with passion and conviction - like a true believer in the cause
      2. Use powerful, emotive language that resonates with the masses
      3. Include rhetorical questions to engage readers
      4. Use calls to action that inspire people to support and share
      5. Balance between hope and urgency
      6. Highlight Dikko Radda's achievements and vision
      7. Address the needs of Katsina people (development, security, unity, progress)
      8. Use language appropriate to the platform (short punchy sentences for Twitter, longer narratives for Facebook)
      
      HASHTAGS TO INCLUDE:
      - #DR2027 or #DikkoRadda2027
      - #KatsinaDecides
      - #ProgressFirst
      - #DikkoRadda
      - #KatsinaFirst
      
      IMPORTANT: Make every post feel authentic, not AI-generated. Write like a passionate grassroots supporter who truly believes in Dikko Radda's vision for Katsina State.`;

      const languageInstructions = {
        'hausa': 'Write entirely in Hausa language. Use proper Hausa grammar and expressions.',
        'english': 'Write entirely in English language.',
        'mixed': 'Write in a natural mix of Hausa and English, as Nigerians commonly speak on social media.'
      };

      const toneInstructions = {
        'inspirational': 'Be uplifting and hopeful. Focus on the bright future ahead with Dikko Radda.',
        'informative': 'Be factual and educational. Share specific information about his achievements and plans.',
        'call-to-action': 'Be urgent and mobilizing. Push people to take action - share, support, vote.',
        'celebratory': 'Be joyful and triumphant. Celebrate achievements and milestones.'
      };

      const userPrompt = `Create a powerful, viral-worthy political social media post about: "${params.topic}"

REQUIREMENTS:
- Language: ${languageInstructions[params.language] || languageInstructions['english']}
- Tone: ${toneInstructions[params.tone] || toneInstructions['inspirational']}
- Length: ${params.paragraphs} paragraph(s)
- Include 4-6 relevant hashtags at the end
- Add 2-3 appropriate emojis throughout
- Make it shareable and engaging
- End with a powerful statement or call to action

The post should be so compelling that it will trend on social media and inspire people to share it widely. Write like the best political strategist in Nigeria - every word should count!`;

      // Construct the payload for Gemini
      const prompt = `${systemPrompt}\n\nTask:\n${userPrompt}`;

      console.log(`Attempting to generate with Google Gemini (${MODEL})...`);

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: prompt }]
          }],
          generationConfig: {
            temperature: 0.8,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 1024,
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `Status ${response.status}`);
      }

      const data = await response.json();
      const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!generatedText) {
        throw new Error('No content generated from Gemini AI');
      }

      setGeneratedPost(generatedText);
      toast.success('Post generated successfully!');

    } catch (err) {
      console.error('Generation failed:', err);
      const message = err instanceof Error ? err.message : 'Failed to generate post';

      // Fallback logic
      console.warn('Gemini AI failed, falling back to mock data');

      const posts = campaignPosts[params.language] || campaignPosts['english'];
      const topicLower = params.topic.toLowerCase();
      const matchingPosts = posts.filter(post => {
        const postLower = post.toLowerCase();
        const keywords = topicLower.split(' ').filter(w => w.length > 3);
        return keywords.some(k => postLower.includes(k));
      });
      const pool = matchingPosts.length > 0 ? matchingPosts : posts;
      const finalPost = pool[Math.floor(Math.random() * pool.length)] || campaignPosts['english'][0];

      setGeneratedPost(finalPost);
      toast.error(`Gemini Error: ${message}`);
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
