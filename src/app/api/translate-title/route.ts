import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function POST(req: NextRequest) {
    console.log("!!! API HIT !!!");
    console.log("=== TRANSLATE TITLE API CALLED ===");
    console.log("API Key loaded (GOOGLE):", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY);
    console.log("API Key loaded (GEMINI):", !!process.env.GEMINI_API_KEY);

    try {
        const { id, title } = await req.json();

        if (!id || !title || typeof title !== 'string') {
            return NextResponse.json({ error: 'Property ID and title are required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("No API key available. Translation aborted.");
            return NextResponse.json({ error: 'API key is not configured.' }, { status: 500 });
        }

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

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
        });
        
        if (!response.ok) {
            throw new Error(`Gemini API Error: ${await response.text()}`);
        }
        
        const result = await response.json();
        let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
        responseText = responseText.trim();

        if (responseText.includes('\`\`\`')) {
            responseText = responseText.replace(/\`\`\`[a-z]*\n?/gi, '').replace(/\`\`\`/g, '').trim();
        }

        const parsed = JSON.parse(responseText);
        const title_en = parsed.en?.trim();
        const title_th = parsed.th?.trim();

        if (!title_en || !title_th) {
            throw new Error("Failed to parse both translations from Gemini response.");
        }

        // Save to Database bypassing RLS
        const supabaseAdmin = await createAdminClient();
        const { error: updateError } = await supabaseAdmin
            .from('properties')
            .update({ title_en, title_th })
            .eq('id', id);

        if (updateError) {
             console.error("Failed to save translation to DB:", updateError);
             // Return success anyway so frontend can display it, even if caching failed
        }

        return NextResponse.json({ title_en, title_th });

    } catch (error: any) {
        console.error('Title Translation API Error:', error);
        return NextResponse.json(
            { error: 'Translation failed', details: error.message },
            { status: 500 }
        );
    }
}
