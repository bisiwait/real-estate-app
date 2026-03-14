import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isPremium } from '@/lib/utils/plan';

export const runtime = 'edge';

export async function POST(req: NextRequest) {
    try {
        const supabase = await createClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (!isPremium(profile)) {
            return NextResponse.json({ error: 'Premium plan required for AI features.' }, { status: 403 });
        }

        const { title, price, area, layout, facilities, developer } = await req.json();

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured.' }, { status: 500 });
        }


        const { GoogleGenerativeAI } = await import('@google/generative-ai');
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

        const prompt = `
あなたはパタヤとシラチャの市場に精通した、高級不動産専門のコピーライターです。
以下の物件情報に基づいて、日本語（JP）、英語（EN）、タイ語（TH）の3ヶ国語で魅力的な紹介文を作成してください。

【物件情報】
物件名: ${title}
デベロッパー: ${developer || '不明'}
価格: ${price}
エリア: ${area}
間取り: ${layout}
主な設備・特徴: ${facilities}

【作成指示】
1. **重要**: デベロッパー名が判明している場合は、必ず紹介文の最初の1〜2文の中でその名前に言及し、信頼性やブランド価値を強調してください。
2. 投資家（利回り・出口戦略）および居住目的（快適性・生活環境）の両方に訴求する内容にしてください。
3. エリア（パタヤ/シラチャ）の希少性や将来性について具体的に触れてください。

【出力形式】
以下のJSON形式のみで回答してください。JSON以外の文章は含めないでください。
{
  "jp": "...",
  "en": "...",
  "th": "..."
}

【トーン・指示】
- 日本語：誠実かつ高級感のある丁寧な文章。日本人駐在員や投資家が安心感を持てる内容にしてください。
- 英語：モダンでキャッチーな不動産広告風の文章。グローバルな投資家やエキスパットを惹きつける魅力的な表現にしてください。
- タイ語：信頼感があり、物件の価値をストレートに伝える文章。地元タイ人の富裕層や投資家にも響く内容にしてください。
- 各言語とも、改行が必要な箇所には "\\n" を含めてください。
`;

        const tryQuery = async (modelName: string) => {
            const model = genAI.getGenerativeModel({ model: modelName });
            let retryCount = 0;
            const maxRetries = 1;

            while (retryCount <= maxRetries) {
                try {
                    return await model.generateContent(prompt);
                } catch (err: any) {
                    const status = err.status || err.response?.status;
                    const isRateLimit = status === 429 || err.message?.includes('429');
                    if (isRateLimit && retryCount < maxRetries) {
                        retryCount++;
                        console.warn(`Gemini 429 hit. Retrying in 5s...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue;
                    }
                    throw err;
                }
            }
        };

        const modelsToTry = ["gemini-1.5-flash", "gemini-1.5-flash-8b", "gemini-2.0-flash"];
        let result = null;
        const errorHistory: string[] = [];

        for (const modelName of modelsToTry) {
            try {
                result = await tryQuery(modelName);
                if (result) break; // Success!
            } catch (err: any) {
                console.warn(`Model ${modelName} failed:`, err.message);
                errorHistory.push(`${modelName}: ${err.message}`);

                const status = err.status || err.response?.status;
                const isRateLimit = status === 429 || err.message?.includes('429');
                const isNotFound = status === 404 || err.message?.includes('404');

                if (isRateLimit || isNotFound) {
                    continue;
                } else {
                    throw err;
                }
            }
        }

        if (!result) {
            const compositeMsg = `[DEBUG_V3] 全てのAIモデルが制限中または利用不可です。\n試行履歴:\n- ${errorHistory.join('\n- ')}`;
            const lastError: any = new Error(compositeMsg);
            lastError.status = 429;
            throw lastError;
        }

        let responseText = result.response.text().trim();

        // Remove markdown code blocks if present
        if (responseText.includes('```')) {
            responseText = responseText.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
        }

        try {
            const parsedData = JSON.parse(responseText);
            return NextResponse.json(parsedData);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", responseText);
            return NextResponse.json({
                error: 'AIからの応答をパースできませんでした。',
                rawBody: responseText
            }, { status: 500 });
        }

    } catch (error: any) {
        console.error('API Generate Description Error:', error);

        const status = error.status || error.response?.status;
        const errMsg = error.message || "Unknown error";
        const isGeminiRateLimit = (status === 429 || errMsg.includes('429')) &&
            (errMsg.includes('Gemini') || errMsg.includes('Google') || errMsg.includes('Generative'));

        if (isGeminiRateLimit) {
            return NextResponse.json({
                error: 'AIサービス（Gemini）の利用制限に達しました。1〜2分ほど待ってから再度お試しください。',
                details: `Google API Error: ${errMsg}`,
                isRateLimit: true
            }, { status: 429 });
        }

        return NextResponse.json({
            error: errMsg,
            details: `Error Type: ${error.name}, Message: ${errMsg}`,
            isRateLimit: false
        }, { status: 500 });
    }
}
