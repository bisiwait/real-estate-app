import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'edge';

// Initialize Supabase admin client to bypass RLS for image upload
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST(req: NextRequest) {
    try {
        const { url } = await req.json();

        if (!url) {
            return NextResponse.json({ error: 'URL is required' }, { status: 400 });
        }

        const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json({ error: 'GOOGLE_GENERATIVE_AI_API_KEY is not configured on the server.' }, { status: 500 });
        }

        // 1. Fetch HTML with full browser headers
        let response;
        try {
            response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                    'Referer': 'https://www.google.com/',
                }
            });
        } catch (fetchErr: any) {
            console.error('Fetch error:', fetchErr);
            throw new Error(`物件サイトに接続できませんでした。URLが正しいか確認してください。 (Network Error)`);
        }

        if (!response.ok) {
            if (response.status === 429) {
                // Return a specific message for site-side limits
                return NextResponse.json({
                    error: "【アクセス拒絶】物件サイト側からアクセスの一時制限を受けています。このサイトは現在取り込みができません。別の物件サイトでお試しください。",
                    details: "Target site returned 429"
                }, { status: 429 });
            }
            return NextResponse.json({
                error: `物件サイトの読み込みに失敗しました (Status: ${response.status})。`,
                details: response.statusText
            }, { status: response.status });
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 2. Extract Basic Elements
        $('script, style, noscript, iframe, svg, head, nav, footer').remove();
        let textContent = $('body').text().replace(/\s+/g, ' ').trim();

        // Further reduce to avoid "heavy request" triggers and token limits on free tier
        textContent = textContent.slice(0, 10000);

        // Extract potential images
        const images: string[] = [];
        $('img').each((i, el) => {
            let src = $(el).attr('src') || $(el).attr('data-src');
            if (src && !src.startsWith('data:') && !src.includes('avatar') && !src.includes('logo') && !src.endsWith('.svg')) {
                try {
                    const absoluteUrl = new URL(src, url).href;
                    if (!images.includes(absoluteUrl)) {
                        images.push(absoluteUrl);
                    }
                } catch (e) {
                    // Ignore invalid URLs
                }
            }
        });

        // 3. Query Gemini with Dual-Model Fallback and Faster Retries
        const genAI = new GoogleGenerativeAI(apiKey);

        const prompt = `
You are a professional real estate agent helping Japanese expats and investors in Thailand.
Extract real estate property details from the following website text and list of images.

Target URL: ${url}
Images found on page:
${images.slice(0, 50).join('\n')}

Text Content:
${textContent}

Tasks:
1. "title": Create a welcoming property title in Japanese (up to 40 chars).
2. "description": Write an appealing, natural Japanese description detailing the selling points, location, and atmosphere. Ensure it targets Japanese expats or investors. Use HTML formatting like <br/> for line breaks if needed.
3. "rent_price": Extract the monthly rent as a plain INTEGER number (e.g., 25000). If it's only for sale, use 0.
4. "sale_price": Extract the sale price as a plain INTEGER number (e.g., 3500000). If it's only for rent, use 0.
5. "is_for_rent": Boolean. Set to true if it is available for rent.
6. "is_for_sale": Boolean. Set to true if it is available for sale.
7. "sqm": Extract the property size in square meters as a plain INTEGER or FLOAT number (e.g., 35.5). Look for sqm, sq.m, or 平米.
8. "layout": Extract the room layout (e.g. "1 Bedroom", "Studio", "2 LDK").
9. "floor": Extract the floor ONLY as a plain INTEGER or string (e.g. "10", "High", "Low"). Do not include words like "Level", "Floor", or "階". Look for "Floor", "Level", or "階". If not found, leave blank string.
10. "amenities": Identify unit-specific amenities. Select from this list: ["バスタブあり", "ウォシュレット完備", "洗濯機", "テレビ", "冷蔵庫", "WiFi", "ペット可", "EV充電器あり", "高層階", "築浅", "格安", "高級物件", "バルコニー広い", "オーシャンビュー", "シティービュー"].
11. "facilities": Identify project-wide shared facilities. Select from this list: ["プール", "インフィニティプール", "サウナ", "フィットネス", "スカイラウンジ", "多目的ルーム", "キッズルーム", "レストラン", "EV充電器", "オートロック", "24Hセキュリティ", "コンシェルジュ", "駐車場", "WiFi", "シャトルサービス"].
12. "image_urls": Select 1 to 5 property photos.
13. "building_name": Name of the condominium/project.
14. "area": City or area name.
15. "latitude": Extract the latitude of the property as a FLOAT number if found.
16. "longitude": Extract the longitude of the property as a FLOAT number if found.
17. "sns_copy_ja": Create a short, catchy SNS copy in Japanese for this property. Use bullet points, emojis, and hashtags (e.g., #PattayaRealEstate #PattayaProperty). Ensure it appeals to investors or expats.
18. "sns_copy_en": Create a short, catchy SNS copy in English for this property. Use bullet points, emojis, and hashtags.
19. "sns_copy_th": Create a short, catchy SNS copy in Thai for this property. Use bullet points, emojis, and hashtags.

Respond EXACTLY with valid JSON. Do not include markdown JSON code blocks or wrappers.
{
  "title": "...",
  "description": "...",
  "rent_price": 0,
  "sale_price": 0,
  "is_for_rent": true,
  "is_for_sale": false,
  "sqm": 0,
  "layout": "...",
  "floor": "...",
  "amenities": ["...", "..."],
  "facilities": ["...", "..."],
  "image_urls": ["...", "..."],
  "building_name": "...",
  "area": "...",
  "latitude": 0,
  "longitude": 0,
  "sns_copy_ja": "...",
  "sns_copy_en": "...",
  "sns_copy_th": "..."
}
`;

        const tryQuery = async (modelName: string) => {
            const model = genAI.getGenerativeModel({ model: modelName });
            console.log("Calling Gemini API with model:", modelName);

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
                        console.warn(`Gemini 429 hit for ${modelName}. Retrying in 5s...`);
                        await new Promise(resolve => setTimeout(resolve, 5000));
                        continue;
                    }
                    throw err;
                }
            }
            throw new Error(`Failed to get response from Gemini model ${modelName} after retries`);
        };

        const modelsToTry = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-2.5-flash"];
        let result = null;
        const errorHistory: string[] = [];

        for (const modelName of modelsToTry) {
            try {
                result = await tryQuery(modelName);
                if (result) break; // Success!
            } catch (err: any) {
                console.warn(`Model ${modelName} failed:`, err.message);
                errorHistory.push(`${modelName}: ${err.message}`);
                // Continue to next model for 429 or 404
                const status = err.status || err.response?.status;
                const isRateLimit = status === 429 || err.message?.includes('429');
                const isNotFound = status === 404 || err.message?.includes('404');

                if (isRateLimit || isNotFound) {
                    continue;
                } else {
                    // Critical error (e.g. 401, 403), stop early
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

        if (responseText.includes('```')) {
            responseText = responseText.replace(/```[a-z]*\n?/gi, '').replace(/```/g, '').trim();
        }

        let parsedData;
        try {
            parsedData = JSON.parse(responseText);
        } catch (e: any) {
            console.error("Failed to parse Gemini JSON:", responseText);
            throw new Error(`AIからのデータ解析に失敗しました。`);
        }

        // 4. Upload Images to Supabase Storage if found
        let finalImageUrls: string[] = [];

        if (parsedData.image_urls && Array.isArray(parsedData.image_urls)) {
            const targetImages = parsedData.image_urls.slice(0, 5);
            const uploadPromises = targetImages.map(async (imageUrl: string) => {
                if (!imageUrl) return null;
                try {
                    const imgRes = await fetch(imageUrl, { signal: AbortSignal.timeout(5000) });
                    if (imgRes.ok) {
                        const arrayBuffer = await imgRes.arrayBuffer();
                        const buffer = Buffer.from(arrayBuffer);

                        const fileExt = imageUrl.split('.').pop()?.split('?')[0] || 'jpg';
                        const fileName = `imported_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

                        const { data, error } = await supabase.storage
                            .from('property-images')
                            .upload(fileName, buffer, {
                                contentType: imgRes.headers.get('content-type') || 'image/jpeg',
                                upsert: false
                            });

                        if (data && !error) {
                            const { data: publicUrlData } = supabase.storage
                                .from('property-images')
                                .getPublicUrl(fileName);

                            return publicUrlData.publicUrl;
                        }
                    }
                } catch (err) {
                    console.error("Image upload failed for", imageUrl);
                }
                return null;
            });

            const results = await Promise.all(uploadPromises);
            finalImageUrls = results.filter((url): url is string => url !== null);
            parsedData.image_urls = finalImageUrls;
            if (finalImageUrls.length > 0) {
                parsedData.main_image_url = finalImageUrls[0];
            }
        }

        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error('API Extract Error:', error);

        // If we caught an error from the scraper earlier, it might already be handled by returning a NextResponse.
        // However, if logic reached here as a thrown error:

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
