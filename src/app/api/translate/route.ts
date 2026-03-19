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
Translate the following text into Japanese, English, and Thai.
Ensure the translation is natural and suitable for real estate property descriptions.

Text to translate:
"${text}"

Return EXACTLY with the following valid JSON format. Do not use markdown wrappers like \`\`\`json.
{
  "ja": "Japanese translation here",
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

    // --- CASE 3: AI HTML Extraction (Importer) ---
    if (body.action === 'extract' && body.html) {
        const { html } = body;
        try {
            console.log(`[Importer] Processing direct HTML payload (${html.length} chars)`);
            
            // 1. Raw RegExp extraction BEFORE any DOM parsing
            const urlRegex = /https?:\/\/[^\s"'><\[\]]+\.(?:jpg|jpeg|png|webp)/gi;
            const matches = html.match(urlRegex) || [];
            
            // 2. Filter and deduplicate
            const uniqueUrls = new Set<string>();
            const excludedKeywords = ['logo', 'icon', 'avatar', 'marker', 'pixel'];
            
            matches.forEach((url: string) => {
                const lowerUrl = url.toLowerCase();
                if (!excludedKeywords.some(keyword => lowerUrl.includes(keyword))) {
                    uniqueUrls.add(url);
                }
            });
            
            // Limit to top 15 candidates
            const input_images = Array.from(uniqueUrls).slice(0, 15);
            console.log("DEBUG_IMAGES:", input_images);
            
            // 3. Now use Cheerio to structurally parse and cleanse the DOM for text extraction
            const cheerio = require('cheerio');
            const $ = cheerio.load(html);

            // Remove entirely noisy semantic tags
            $('script, style, header, footer, nav, aside, iframe, noscript, svg').remove();

            let cleanText = $('body').text()
                .replace(/\s+/g, ' ')
                .trim()
                .substring(0, 15000); 

            const prompt = `
You are an expert real estate data extraction assistant.
You have been provided with a list of "Extracted Image URLs" and the "Cleaned HTML Text" from a property listing.

Extracted Image URLs:
[
${input_images.length > 0 ? input_images.map(url => `  "${url}"`).join(',\n') : '  "No images found"'}
]

Cleaned HTML Text:
"${cleanText}"

Extract structured property details based ONLY on the text above. 
For images, you MUST return exactly the "Extracted Image URLs" array provided above up to 10 items. Do not select images that are not in the list.
Return EXACTLY a valid JSON object. Do not use markdown wrappers like \`\`\`json.
IMPORTANT EXCLUSION RULE: If a field cannot be found or securely deduced from context, do NOT leave it blank or null. You MUST output exactly "要確認" (Needs Validation).

Extract the following exact fields matching the database schema:
- "title": (string) The main title or catchphrase of the listing (in Japanese).
- "building_name": (string) The name of the condo/project.
- "area": (string) The neighborhood, district, or sub-district.
- "description": (string) The detailed description or listing features (in Japanese).
- "sale_price": (number) The sale price (digits only, no commas).
- "rent_price": (number) The monthly rent price (digits only, no commas).
- "sqm": (number) Property size in square meters (digits only).
- "floor": (number) Which floor the unit is on.
- "bedrooms": (number) Number of bedrooms (e.g., 1, 2, 3), use 0 for Studio.
- "features": (array of strings) Extract all amenities, facilities, and property features (e.g., Pool, Gym, Security, Balcony) found in "Amenities" or "Facilities" sections. Translate them to Japanese.
- "images": (array of strings) Return exactly the contents of the 'Extracted Image URLs' list provided to you.
`;
            const result = await model.generateContent(prompt);
            let responseText = result.response.text().trim();
            if (responseText.includes('\`\`\`')) {
                responseText = responseText.replace(/\`\`\`[a-z]*\n?/gi, '').replace(/\`\`\`/g, '').trim();
            }
            const parsed = JSON.parse(responseText);
            
            // 物理的に抽出した URL があるなら、Gemini の空の結果を上書きする
            if (input_images && input_images.length > 0) {
                parsed.images = input_images;
                console.log("FORCE OVERWRITE IMAGES:", parsed.images.length, "urls");
            } else if (!parsed.images || !Array.isArray(parsed.images)) {
                parsed.images = [];
            }
            
            return NextResponse.json(parsed);

        } catch (extractError) {
            console.error("Gemini Extract Error:", extractError);
            throw extractError;
        }
    }

    // --- If neither matches ---
    return NextResponse.json({ error: 'Invalid payload for translation (requires {text} OR {id, title} OR {action: "extract", url})' }, { status: 400 });

  } catch (error: any) {
    console.error('Unified Translation API Error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
}
