import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text is required for translation' }, { status: 400 });
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'API key is not configured.' },
        { status: 500 }
      );
    }

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

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
    });
    
    if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Gemini API Error: ${errText}`);
    }
    
    const result = await response.json();
    let responseText = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
    responseText = responseText.trim();

    if (responseText.includes('\`\`\`')) {
      responseText = responseText.replace(/\`\`\`[a-z]*\n?/gi, '').replace(/\`\`\`/g, '').trim();
    }

    const parsed = JSON.parse(responseText);

    return NextResponse.json({
      ja: parsed.ja || '',
      en: parsed.en || '',
      th: parsed.th || ''
    });

  } catch (error: any) {
    console.error('Translation API Error:', error);
    return NextResponse.json(
      { error: 'Translation failed', details: error.message },
      { status: 500 }
    );
  }
}
