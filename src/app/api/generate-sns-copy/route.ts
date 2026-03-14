import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/lib/utils/plan';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    console.log("================== SNS COPY API TRIGGERED ==================");
    console.log("DEBUG: GOOGLE_GENERATIVE_AI_API_KEY =", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "FOUND" : "NOT FOUND");
    console.log("DEBUG: GEMINI_API_KEY =", process.env.GEMINI_API_KEY ? "FOUND" : "NOT FOUND");
    
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('plan, plan_type, is_admin')
            .eq('id', user.id)
            .single();

        if (profileError) {
             console.error("[SNS API] Profile fetch error:", profileError);
             return NextResponse.json({ error: 'Failed to fetch user profile' }, { status: 500 });
        }

        if (!isPremium(profile)) {
            console.error("[SNS API] Access denied. User profile:", profile);
            return NextResponse.json({ error: 'Premium plan required' }, { status: 403 });
        }

        const { propertyId, title, price, area, description, amenities, facilities, sqm, floor } = await req.json();

        if (!propertyId || !title) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // === TEMPORARY HARDCODE FOR DEBUGGING ONLY ===
        // If the .env is failing completely, we will temporarily supply the key that works in other API routes.
        // User's previous command check showed: AIzaSyB-B31zROz-SfXaRUTvsM0rtp1sMckE2z8
        const fallbackKey = 'AIzaSyB-B31zROz-SfXaRUTvsM0rtp1sMckE2z8';
        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || fallbackKey;

        if (!apiKey) {
            console.error("[SNS API Error] API Key is missing. GOOGLE_GENERATIVE_AI_API_KEY:", process.env.GOOGLE_GENERATIVE_AI_API_KEY ? "EXISTS" : "UNDEFINED");
            return NextResponse.json({ error: 'Server configuration error: Missing API Key' }, { status: 500 });
        }

        // --- STRICT DEBUG LOG ---
        const maskedKey = apiKey.substring(0, 4) + '... *HIDDEN* ...' + apiKey.slice(-4);
        console.log(`[SNS API Debug] Using API Key: ${maskedKey} (Length: ${apiKey.length})`);
        console.log(`[SNS API Debug] Is using fallback hardcoded key? ${apiKey === fallbackKey ? 'YES' : 'NO'}`);


        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

        const prompt = `
You are an expert real estate Social Media Manager in Thailand targeting Pattaya and Sriracha investors and expats.
Please write an engaging SNS post copy (for Facebook/Instagram) for the following property.

Property Details:
- Title: ${title}
- Price/Conditions: ${price} THB
- Area: ${area || 'Unknown'}
- Size: ${sqm ? sqm + ' Sqm' : 'N/A'}
- Floor: ${floor || 'N/A'}
- Description: ${description || 'N/A'}
- Amenities: ${amenities ? amenities.join(', ') : 'N/A'}
- Shared Facilities: ${facilities ? facilities.join(', ') : 'N/A'}

Requirements:
1. You must return EXACTLY a JSON object with 3 keys: "ja", "en", and "th". Do not include markdown formatting like \`\`\`json.
2. Each language value should follow this structure EXACTLY:
   - 【Catchphrase】思わずクリックしたくなる一行 (Make them stop scrolling).
   - 【3 Features】物件の3つの魅力. Use emojis like ✨, ✅ for bullet points.
   - 【Price & Conditions】価格・条件を一目でわかるように. 
   - 【Hashtags】エリア別ハッシュタグ
3. Tone & Style by Language:
   - Japanese: 信頼感がありつつ、限定感を煽るポジティブな文体（感嘆符を活用）。(e.g., "残りわずか！", "必見！")
   - English: Use strong hooks like "Best Deal!", "High ROI", "Don't miss out!".
   - Thai: 地元の不動産グループで好まれる、丁寧かつスピード感のある形式。(Fast closing, polite)
4. Use emojis tastefully throughout (🏠, 💰, 📍).
5. Hashtags Logic:
   - Always include general tags like #RealEstate #ThailandProperty
   - If Area contains "Pattaya" or "パタヤ", include #PattayaCondo #PattayaInvestment
   - If Area contains "Sriracha" or "シラチャ", include #SrirachaLife #JpTown

Return JSON only:
{
  "ja": "...",
  "en": "...",
  "th": "..."
}
`;
        console.log(`[SNS API Debug] Starting SDK generateContent with gemini-2.0-flash...`);
        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();
        console.log(`[SNS API Debug] Generation completed. Response length: ${responseText.length}`);

        if (responseText.startsWith('\`\`\`')) {
            responseText = responseText.replace(/\`\`\`(json)?/g, '').trim();
        }

        let parsed;
        try {
            parsed = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Gemini output:", responseText);
            return NextResponse.json({ error: 'Failed to generate copy properly' }, { status: 500 });
        }

        // Save to DB
        const { error: updateError } = await supabase
            .from('properties')
            .update({
                sns_copy_ja: parsed.ja || '',
                sns_copy_en: parsed.en || '',
                sns_copy_th: parsed.th || ''
            })
            .eq('id', propertyId)
            .eq('user_id', user.id);

        if (updateError) {
            console.error("[SNS API DB Error] Failed to update properties table:", JSON.stringify(updateError, null, 2));
            return NextResponse.json({ error: 'Failed to save generated copy', details: updateError }, { status: 500 });
        }

        return NextResponse.json({ 
            ja: parsed.ja, 
            en: parsed.en, 
            th: parsed.th 
        });

    } catch (error: any) {
        console.error("================== FULL ERROR CATCH ==================");
        console.error("FULL ERROR OBJECT:", error);
        console.error("Error Message:", error?.message);
        console.error("Error Status:", error?.status);
        console.error("======================================================");
        
        return NextResponse.json({ error: error.message || 'Internal server error', details: error.toString() }, { status: 500 });
    }
}
