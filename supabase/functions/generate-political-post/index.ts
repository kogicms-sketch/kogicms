import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const SYSTEM_PROMPT = `You are an expert Nigerian political content writer and social media strategist specializing in creating viral, compelling political posts. You are writing content to support Dikko Umar Radda, the Executive Governor of Katsina State.

ABOUT DIKKO UMAR RADDA:
- Executive Governor of Katsina State
- A visionary leader committed to security and development
- A true son of Katsina State, dedicated to its progress
- Known for his integrity, discipline, and commitment to good governance
- Experienced administrator and leader
- Championing the transformation of Katsina State through sustainable development
- Focused on security, agriculture, education, and youth empowerment

KATSINA STATE CONTEXT:
- One of the states most affected by insecurity in Northwest Nigeria
- Rich in agriculture, commerce, and natural resources
- People yearn for continued security, development, and good governance
- Strong cultural heritage and values

YOUR WRITING STYLE:
1. Write with passion and conviction - like a true believer in the cause
2. Use powerful, emotive language that resonates with the masses
3. Include rhetorical questions to engage readers
4. Use calls to action that inspire people to support and share
5. Balance between hope and urgency
6. Highlight Dikko Radda's achievements and vision
7. Address the needs of Katsina people (security, development, unity)
8. Use language appropriate to the platform (short punchy sentences for Twitter, longer narratives for Facebook)

HASHTAGS TO INCLUDE:
- #DR2027 or #DikkoRadda2027
- #KatsinaDecides
- #ProgressAndDevelopment
- #DikkoRadda
- #KatsinaFirst
- Other relevant trending hashtags

LANGUAGE GUIDELINES:
- If Hausa: Use proper, respectful Hausa with modern expressions
- If English: Use clear, powerful English accessible to all
- If Mixed: Blend both naturally as Nigerians speak

IMPORTANT: Make every post feel authentic, not AI-generated. Write like a passionate grassroots supporter who truly believes in Dikko Radda's vision for Katsina State.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, language, paragraphs, tone } = await req.json();
    
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    
    // Mock data if API key is missing
    if (!GEMINI_API_KEY) {
      console.warn('GEMINI_API_KEY is not configured, using mock data');
      
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const mockPost = `🇳🇬 **PROGRESS WITH DIKKO RADDA!** 🇳🇬

Katsina State is moving forward! His Excellency, Dikko Umar Radda is leading us toward a secure and prosperous future! 🌟

Regarding "${topic}", let us be clear: We are committed to excellence. With his visionary leadership, Katsina is experiencing unprecedented development and security improvements.

Let us rally behind our Governor! 
Katsina State deserves continued progress and prosperity.

Support DR! Join the movement! 🚀

#DR2027 #KatsinaDecides #ProgressAndDevelopment #KatsinaFirst`;

      return new Response(JSON.stringify({ post: mockPost }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const languageInstructions = {
      'hausa': 'Write entirely in Hausa language. Use proper Hausa grammar and expressions.',
      'english': 'Write entirely in English language.',
      'mixed': 'Write in a natural mix of Hausa and English, as Nigerians commonly speak on social media.'
    };

    const toneInstructions = {
      'inspirational': 'Be uplifting and hopeful. Focus on the bright future ahead with Dikko Radda.',
      'informative': 'Be factual and educational. Share specific information about his achievements and plans.',
      'call-to-action': 'Be urgent and mobilizing. Push people to take action - share, support, participate.',
      'celebratory': 'Be joyful and triumphant. Celebrate achievements and milestones.'
    };

    const userPrompt = `Create a powerful, viral-worthy political social media post about: "${topic}"

REQUIREMENTS:
- Language: ${languageInstructions[language as keyof typeof languageInstructions] || languageInstructions['english']}
- Tone: ${toneInstructions[tone as keyof typeof toneInstructions] || toneInstructions['inspirational']}
- Length: ${paragraphs} paragraph(s)
- Include 4-6 relevant hashtags at the end
- Add 2-3 appropriate emojis throughout
- Make it shareable and engaging
- End with a powerful statement or call to action

The post should be so compelling that it will trend on social media and inspire people to share it widely. Write like the best political strategist in Nigeria - every word should count!`;

    console.log('Generating political post with params:', { topic, language, paragraphs, tone });

    // Use Google Gemini API directly
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: `${SYSTEM_PROMPT}\n\n${userPrompt}` }]
          }
        ],
        generationConfig: {
          temperature: 0.9,
          maxOutputTokens: 2048,
        }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Gemini API error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const generatedPost = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!generatedPost) {
      console.error('No content in response:', JSON.stringify(data));
      throw new Error('No content generated');
    }

    console.log('Post generated successfully');

    return new Response(JSON.stringify({ post: generatedPost }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating post:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Failed to generate post' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
