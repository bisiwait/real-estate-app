import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  console.log("--- REACHED POST FUNCTION ---");
  console.log("!!! API HIT !!!  -> Unified /api/translate Endpoint (SDK Version)");

  try {
    const body = await req.json();
    console.log("BODY STRIPPED:", JSON.stringify(body));

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.error("No API key available. Translation aborted.");
      return NextResponse.json({ error: 'API key is not configured.' }, { status: 500 });
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    // Use gemini-flash-latest as gemini-1.5-flash no longer exists for this key
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    // --- CASE 1: Property Title Translation & DB Save ---
    if (body.id && body.title) {
        const { id, title } = body;
        
        try {
            // 1. Check Database Cache First
            const supabaseAdmin = await createAdminClient();
            const { data: existingProp } = await supabaseAdmin
                .from('properties')
                .select('title_en, title_th')
                .eq('id', id)
                .single();

            // If translations already exist in DB, return them immediately without calling Gemini
            if (existingProp?.title_en && existingProp?.title_th) {
                console.log(`CACHE HIT [${id}]: Returning previously saved English/Thai titles.`);
                return NextResponse.json({ 
                    title_en: existingProp.title_en, 
                    title_th: existingProp.title_th 
                });
            }

            console.log(`CACHE MISS [${id}]: Generating new localizations from Gemini.`);
            const prompt = `
Translate the following real estate property title into English and Thai.
Keep it concise and natural as a property listing title.

Title:
"${title}"

Return EXACTLY with the following valid JSON format. Do not use markdown wrappers like \`\`\`json.
{
  "en": "English translation here",
  "th": "Thai translation here"
}
`;
            const result = await model.generateContent(prompt);
            let responseText = result.response.text().trim();

            if (responseText.includes('\`\`\`')) {
                responseText = responseText.replace(/\`\`\`[a-z]*\n?/gi, '').replace(/\`\`\`/g, '').trim();
            }

            const parsed = JSON.parse(responseText);
            const title_en = parsed.en?.trim() || '';
            const title_th = parsed.th?.trim() || '';

            if (title_en && title_th) {
                // Save to Database bypassing RLS
                const supabaseAdmin = await createAdminClient();
                const { error: updateError } = await supabaseAdmin
                    .from('properties')
                    .update({ title_en, title_th })
                    .eq('id', id);

                if (updateError) {
                    console.error("Failed to save translation to DB:", updateError);
                }
            }

            return NextResponse.json({ title_en, title_th });

        } catch (aiError) {
            console.error("Gemini Title AI Error:", aiError);
            throw aiError;
        }
    }

    // --- CASE 2: General Text Translation (SocialShareDialog etc.) ---
    if (body.text) {
        const { text } = body;
        
        try {
            const prompt = `
You are an expert "SNS Marketer specialized in Pattaya and Sriracha real estate".
Based on the provided "Original Text", generate catchy and exciting social media copies in Japanese, English, and Thai.

### Rules:
1. Tone: Catchy, exciting, and optimized for SNS (Instagram/Facebook).
2. Structure:
   - Start with an impactful headline (use 【】 and emojis).
   - List 3 key benefits in bullet points.
   - End with appropriate hashtags (e.g., #Pattaya #Condo #RealEstate).
3. Language-specific Focus:
   - Japanese: Emphasize "Peace of mind and ROI (安心感と利回り)".
   - English: Emphasize "Lifestyle and Luxury (ライフスタイルとラグジュアリー)".
   - Thai: Emphasize "Trustworthiness and Location (信頼性と立地)".

### Original Text:
"${text}"

Return EXACTLY with the following valid JSON format. Do not use markdown wrappers like \`\`\`json.
{
  "ja": "Japanese SNS copy here",
  "en": "English SNS copy here",
  "th": "Thai SNS copy here"
}
`;
            const result = await model.generateContent(prompt);
            let responseText = result.response.text().trim();

            if (responseText.includes('\`\`\`')) {
                responseText = responseText.replace(/\`\`\`[a-z]*\n?/gi, '').replace(/\`\`\`/g, '').trim();
            }

            const parsed = JSON.parse(responseText);

            return NextResponse.json({
                ja: parsed.ja || '',
                en: parsed.en || '',
                th: parsed.th || ''
            });

        } catch (aiError) {
            console.error("Gemini General AI Error:", aiError);
            throw aiError;
        }
    }

    // --- If neither matches ---
    return NextResponse.json({ error: 'Invalid payload for translation (requires {text} OR {id, title})' }, { status: 400 });

  } catch (error: any) {
    console.error('Unified Translation API Error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
}
