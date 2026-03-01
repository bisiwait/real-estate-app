import { NextRequest, NextResponse } from 'next/server';
export const runtime = 'edge';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as cheerio from 'cheerio';
import { createClient } from '@supabase/supabase-js';

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

        if (!process.env.GEMINI_API_KEY) {
            return NextResponse.json({ error: 'GEMINI_API_KEY is not configured on the server.' }, { status: 500 });
        }

        // 1. Fetch HTML with full browser headers to avoid 403 Forbidden
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
                'Accept-Language': 'en-US,en;q=0.9,ja;q=0.8',
                'Cache-Control': 'max-age=0',
                'Sec-Ch-Ua': '"Chromium";v="124", "Google Chrome";v="124", "Not-A.Brand";v="99"',
                'Sec-Ch-Ua-Mobile': '?0',
                'Sec-Ch-Ua-Platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to fetch URL: ${response.statusText}`);
        }

        const html = await response.text();
        const $ = cheerio.load(html);

        // 2. Extract Basic Elements
        $('script, style, noscript, iframe, svg, head, nav, footer').remove();
        let textContent = $('body').text().replace(/\s+/g, ' ').trim();

        // Truncate to save tokens, though Gemini 1.5 can handle a lot
        textContent = textContent.slice(0, 40000);

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

        // 3. Query Gemini
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        // Use gemini-2.5-flash (gemini-1.5-flash returns 404 on this key)
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

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
3. "price": Extract the price as a plain INTEGER number (e.g., 2800000). Look for THB, Baht, ฿, or numbers with commas. If not found, use 0. If it's for rent, the monthly rent. If it's for sale, the sale price.
4. "sqm": Extract the property size in square meters as a plain INTEGER or FLOAT number (e.g., 35.5). Look for sqm, sq.m, or 平米.
5. "layout": Extract the room layout (e.g. "1 Bedroom", "Studio", "2 LDK").
6. "floor": Extract the floor ONLY as a plain INTEGER or string (e.g. "10", "High", "Low"). Do not include words like "Level", "Floor", or "階". Look for "Floor", "Level", or "階". If not found, leave blank string.
7. "amenities": Identify amenities/features. IF AND ONLY IF they apply, select from this exact list: ["バスタブあり", "ウォシュレット完備", "洗濯機", "テレビ", "冷蔵庫", "WiFi", "ペット可", "EV充電器あり", "高層階", "築浅", "格安", "高級物件", "バルコニー広い", "オーシャンビュー", "シティービュー"]. Return empty array if none apply.
8. "image_urls": Look at the Images found on page list. Select 1 to 5 URLs of property photos (e.g. rooms, buildings, interior). You MUST pick at least 1 URL if any valid .jpg, .png, or .webp image is in the list. Do NOT return an empty array if there are images.
9. "building_name": Extract the name of the condominium, project, or building (e.g., "The Riviera Jomtien", "L Pattaya"). If not found, leave as empty string.
10. "area": Extract the specific city or location area (e.g., "Pattaya", "Jomtien", "Wongamat", "Sriracha"). If not found, leave as empty string.

Respond EXACTLY with valid JSON. Do not include markdown \`\`\`json wrappers.
{
  "title": "...",
  "description": "...",
  "price": 0,
  "sqm": 0,
  "layout": "...",
  "floor": "...",
  "amenities": ["...", "..."],
  "image_urls": ["...", "..."],
  "building_name": "...",
  "area": "..."
}
`;

        const result = await model.generateContent(prompt);
        let responseText = result.response.text().trim();

        // Clean up markdown if the AI includes it despite instructions
        if (responseText.startsWith('```json')) {
            responseText = responseText.replace(/^```json/, '').replace(/```$/, '').trim();
        }

        let parsedData;
        try {
            parsedData = JSON.parse(responseText);
        } catch (e) {
            console.error("Failed to parse Gemini JSON:", responseText);
            throw new Error("AI returned invalid data format.");
        }

        // 4. Upload Images to Supabase Storage if found
        let finalImageUrls: string[] = [];

        if (parsedData.image_urls && Array.isArray(parsedData.image_urls)) {
            // Process uploads in parallel
            const uploadPromises = parsedData.image_urls.map(async (imageUrl: string) => {
                if (!imageUrl) return null;
                try {
                    const imgRes = await fetch(imageUrl);
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
                        } else {
                            console.error('Supabase storage upload error:', error);
                        }
                    }
                } catch (err) {
                    console.error("Image upload failed for", imageUrl, err);
                }
                return null;
            });

            const results = await Promise.all(uploadPromises);
            finalImageUrls = results.filter((url): url is string => url !== null);
            parsedData.image_urls = finalImageUrls;

            // For backward compatibility with the client code if we want to keep it simple
            if (finalImageUrls.length > 0) {
                parsedData.main_image_url = finalImageUrls[0];
            }
        }

        return NextResponse.json(parsedData);

    } catch (error: any) {
        console.error('API Extract Error:', error);
        return NextResponse.json({ error: error.message || 'Something went wrong' }, { status: 500 });
    }
}
