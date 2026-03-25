import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // CORS プリフライト対応
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        const lineAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!
        const siteUrl = Deno.env.get('NEXT_PUBLIC_SITE_URL') || 'https://chonburihome.com'

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        // 1. ペイロード取得
        const { property_id, old_price, new_price, title, new_record } = await req.json()
        console.log(`[notify-price-drop] Property: ${title} (${property_id}) | ${old_price} -> ${new_price}`)

        // 2. お気に入り登録ユーザーの抽出
        const { data: favorites, error: favError } = await supabase
            .from('favorites')
            .select('user_id')
            .eq('property_id', property_id)

        if (favError) throw favError
        if (!favorites || favorites.length === 0) {
            console.log('[notify-price-drop] No users favorited this property.')
            return new Response(JSON.stringify({ message: 'No favorites found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        const userIds = favorites.map(f => f.user_id)

        // 3. ユーザーの line_user_id を取得
        const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('line_user_id')
            .in('id', userIds)
            .not('line_user_id', 'is', null)

        if (profError) throw profError
        const lineUserIds = profiles?.map(p => p.line_user_id).filter(id => !!id) as string[]

        if (!lineUserIds || lineUserIds.length === 0) {
            console.log('[notify-price-drop] No users have line_user_id set.')
            return new Response(JSON.stringify({ message: 'No line_user_ids found' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 4. Flex Message の生成
        const flexMessage = generatePriceDropFlexMessage({
            title,
            oldPrice: old_price,
            newPrice: new_price,
            imageUrl: new_record.images?.[0] || 'https://via.placeholder.com/800x530?text=No+Image',
            propertyUrl: `${siteUrl}/jp/properties/${property_id}`,
            area: new_record.area_name || 'パタヤ'
        })

        // 5. LINE 送信 (Multicast: 最大500人)
        const lineResponse = await fetch('https://api.line.me/v2/bot/message/multicast', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${lineAccessToken}`,
            },
            body: JSON.stringify({
                to: lineUserIds.slice(0, 500),
                messages: [flexMessage]
            }),
        })

        const lineData = await lineResponse.json()
        console.log('[notify-price-drop] LINE API Response:', lineData)

        return new Response(JSON.stringify({ status: 'success', sent_count: lineUserIds.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error: any) {
        console.error('[notify-price-drop] Error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

function formatCurrency(amount: number) {
    return amount.toLocaleString() + ' THB'
}

function generatePriceDropFlexMessage({ title, oldPrice, newPrice, imageUrl, propertyUrl, area }: any) {
    return {
        type: "flex",
        altText: "【値下げ通知】お気に入り物件が安くなりました！",
        contents: {
            type: "bubble",
            hero: {
                type: "image",
                url: imageUrl,
                size: "full",
                aspectRatio: "1.51:1",
                aspectMode: "cover",
                action: {
                    type: "uri",
                    uri: propertyUrl
                }
            },
            body: {
                type: "box",
                layout: "vertical",
                contents: [
                    {
                        type: "text",
                        text: "📉 お気に入りが値下げ！",
                        weight: "bold",
                        color: "#E63946",
                        size: "sm"
                    },
                    {
                        type: "text",
                        text: title,
                        weight: "bold",
                        size: "xl",
                        margin: "md",
                        wrap: true
                    },
                    {
                        type: "box",
                        layout: "vertical",
                        margin: "lg",
                        spacing: "sm",
                        contents: [
                            {
                                type: "box",
                                layout: "baseline",
                                spacing: "sm",
                                contents: [
                                    {
                                        type: "text",
                                        text: "旧価格",
                                        color: "#aaaaaa",
                                        size: "sm",
                                        flex: 1
                                    },
                                    {
                                        type: "text",
                                        text: formatCurrency(oldPrice),
                                        wrap: true,
                                        color: "#666666",
                                        size: "sm",
                                        flex: 4,
                                        decoration: "line-through"
                                    }
                                ]
                            },
                            {
                                type: "box",
                                layout: "baseline",
                                spacing: "sm",
                                contents: [
                                    {
                                        type: "text",
                                        text: "新価格",
                                        color: "#aaaaaa",
                                        size: "sm",
                                        flex: 1
                                    },
                                    {
                                        type: "text",
                                        text: formatCurrency(newPrice),
                                        wrap: true,
                                        color: "#E63946",
                                        size: "xl",
                                        flex: 4,
                                        weight: "bold"
                                    }
                                ]
                            }
                        ]
                    },
                    {
                        type: "box",
                        layout: "baseline",
                        spacing: "xs",
                        margin: "md",
                        contents: [
                            {
                                type: "text",
                                text: "📍 エリア:",
                                color: "#aaaaaa",
                                size: "xs",
                                flex: 1
                            },
                            {
                                type: "text",
                                text: area,
                                color: "#666666",
                                size: "xs",
                                flex: 4
                            }
                        ]
                    }
                ]
            },
            footer: {
                type: "box",
                layout: "vertical",
                spacing: "sm",
                contents: [
                    {
                        type: "button",
                        style: "primary",
                        height: "sm",
                        color: "#1a1e2e",
                        action: {
                            type: "uri",
                            label: "詳細を確認する",
                            uri: propertyUrl
                        }
                    },
                    {
                        type: "spacer",
                        size: "sm"
                    }
                ],
                flex: 0
            }
        }
    }
}
