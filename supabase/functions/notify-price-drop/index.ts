import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

/**
 * 旧: お気に入りユーザーへ LINE Flex で値下げ通知（Messaging API）。
 * Messaging API を廃止したため、LINE 送信は行いません。集計のみログして 200 を返します。
 */
serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

        const supabase = createClient(supabaseUrl, supabaseServiceKey)

        const { property_id, old_price, new_price, title } = await req.json()
        console.log(`[notify-price-drop] Property: ${title} (${property_id}) | ${old_price} -> ${new_price}`)

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

        const { data: profiles, error: profError } = await supabase
            .from('profiles')
            .select('line_user_id')
            .in('id', userIds)
            .not('line_user_id', 'is', null)

        if (profError) throw profError
        const lineUserIds = profiles?.map(p => p.line_user_id).filter(id => !!id) as string[]

        console.log(
            `[notify-price-drop] LINE multicast disabled. favorites=${userIds.length}, profiles_with_line_user_id=${lineUserIds?.length ?? 0}`
        )

        return new Response(
            JSON.stringify({
                message: 'LINE messaging disabled; no push sent',
                favorite_count: userIds.length,
                line_user_id_count: lineUserIds?.length ?? 0,
            }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
        )
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error)
        console.error('[notify-price-drop] Error:', message)
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
