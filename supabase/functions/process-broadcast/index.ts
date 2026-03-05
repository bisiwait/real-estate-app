// supabase/functions/process-broadcast/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
}

serve(async (req) => {
    console.log(`[process-broadcast] Method: ${req.method} | URL: ${req.url}`)

    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    if (req.method === 'POST') {
        console.log('[process-broadcast] POST request received. Starting process...')
    }

    try {
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

        if (!supabaseUrl || !supabaseServiceKey) {
            throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY')
        }

        const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

        // Parse body safely
        let body;
        try {
            body = await req.json()
            console.log('[process-broadcast] Body:', JSON.stringify(body))
        } catch (e) {
            console.error('[process-broadcast] Failed to parse JSON body:', e)
            throw new Error('Invalid JSON body')
        }

        const { broadcastId } = body
        if (!broadcastId) throw new Error('broadcastId is required')

        // 1. Fetch Broadcast Log
        console.log(`[process-broadcast] Step 1: Fetching log ${broadcastId}`)
        const { data: log, error: logError } = await supabaseClient
            .from('broadcast_logs')
            .select('*')
            .eq('id', broadcastId)
            .single()

        if (logError || !log) {
            console.error('[process-broadcast] Log error:', logError)
            throw new Error(`Broadcast log not found: ${logError?.message || 'Unknown error'}`)
        }
        console.log(`[process-broadcast] Log title: ${log.title}`)

        // Update status to processing
        console.log('[process-broadcast] Updating status to processing...')
        await supabaseClient
            .from('broadcast_logs')
            .update({ status: 'processing' })
            .eq('id', broadcastId)

        // 2. Fetch Selected Properties
        console.log(`[process-broadcast] Step 2: Fetching properties ${log.property_ids}`)
        const { data: properties, error: propError } = await supabaseClient
            .from('properties')
            .select('*, area:areas(name)')
            .in('id', log.property_ids)

        if (propError || !properties || properties.length === 0) {
            console.error('[process-broadcast] Properties error:', propError)
            throw new Error('Properties not found')
        }
        console.log(`[process-broadcast] Fetched ${properties.length} properties`)

        // 3. Extract Target Users based on segment
        console.log(`[process-broadcast] Step 3: Extracting users for ${log.segment_type}`)
        let targetUsers: any[] = []

        if (log.segment_type === 'all') {
            const { data: profiles, error: pError } = await supabaseClient
                .from('profiles')
                .select('id, email, full_name, line_id')
            if (pError) console.error('[process-broadcast] Profiles error:', pError)
            targetUsers = profiles || []
        } else if (log.segment_type === 'area_favorites') {
            const { data: areas } = await supabaseClient
                .from('areas')
                .select('id')
                .eq('name', log.segment_value)

            const targetAreaId = areas?.[0]?.id

            if (targetAreaId) {
                const { data: favUsers } = await supabaseClient
                    .from('favorites')
                    .select('user_id, property:properties(area_id)')

                const userIds = [...new Set(favUsers
                    ?.filter(f => f.property?.area_id === targetAreaId)
                    .map(f => f.user_id))]

                if (userIds.length > 0) {
                    const { data: profiles } = await supabaseClient
                        .from('profiles')
                        .select('id, email, full_name, line_id')
                        .in('id', userIds)
                    targetUsers = profiles || []
                }
            }
        }

        console.log(`[process-broadcast] Found ${targetUsers.length} target users.`)

        if (targetUsers.length === 0) {
            console.warn('[process-broadcast] No target users found. Ending.')
            await supabaseClient.from('broadcast_logs').update({ status: 'completed', target_count: 0 }).eq('id', broadcastId)
            return new Response(JSON.stringify({ message: 'No targets' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }

        // 4. Batch Processing (50 users per batch)
        const BATCH_SIZE = 50
        const resendApiKey = Deno.env.get('RESEND_API_KEY')
        const lineAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')

        console.log(`[process-broadcast] API Keys: Resend=${!!resendApiKey}, LINE=${!!lineAccessToken}`)

        for (let i = 0; i < targetUsers.length; i += BATCH_SIZE) {
            const batch = targetUsers.slice(i, i + BATCH_SIZE)
            console.log(`[process-broadcast] Batch ${i / BATCH_SIZE + 1} (${batch.length} users)`)

            const deliveryPromises = batch.map(async (user) => {
                const results = []

                // A. Send Email via Resend
                if (user.email && resendApiKey) {
                    try {
                        const emailRes = await fetch('https://api.resend.com/emails', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${resendApiKey}`,
                            },
                            body: JSON.stringify({
                                from: 'Property Alert <notifications@resend.dev>',
                                to: user.email,
                                subject: log.title,
                                html: generateEmailHtml(user, log, properties),
                            }),
                        })
                        if (emailRes.ok) {
                            results.push({ method: 'email', status: 'sent', user_id: user.id })
                        } else {
                            const errText = await emailRes.text()
                            console.error(`[process-broadcast] Resend error for ${user.email}:`, errText)
                            results.push({ method: 'email', status: 'failed', user_id: user.id, error: errText })
                        }
                    } catch (e) {
                        console.error(`[process-broadcast] Resend exception for ${user.email}:`, e)
                        results.push({ method: 'email', status: 'failed', user_id: user.id, error: e.message })
                    }
                }

                // B. Send LINE Flex Message
                if (user.line_id && lineAccessToken) {
                    try {
                        const lineRes = await fetch('https://api.line.me/v2/bot/message/push', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${lineAccessToken}`,
                            },
                            body: JSON.stringify({
                                to: user.line_id,
                                messages: [generateLineFlexMessage(log, properties)]
                            }),
                        })
                        if (lineRes.ok) {
                            results.push({ method: 'line', status: 'sent', user_id: user.id })
                        } else {
                            const errText = await lineRes.text()
                            console.error(`[process-broadcast] LINE error for ${user.line_id}:`, errText)
                            results.push({ method: 'line', status: 'failed', user_id: user.id, error: errText })
                        }
                    } catch (e) {
                        console.error(`[process-broadcast] LINE exception for ${user.line_id}:`, e)
                        results.push({ method: 'line', status: 'failed', user_id: user.id, error: e.message })
                    }
                }

                return results
            })

            const batchResults = await Promise.all(deliveryPromises)
            const flatResults = batchResults.flat()

            // 5. Save individual recipient logs
            if (flatResults.length > 0) {
                console.log(`[process-broadcast] Saving ${flatResults.length} records to broadcast_recipients`)
                const { error: recError } = await supabaseClient.from('broadcast_recipients').insert(
                    flatResults.map(r => ({
                        broadcast_id: broadcastId,
                        user_id: r.user_id,
                        delivery_method: r.method,
                        status: r.status,
                        error_message: r.error
                    }))
                )
                if (recError) console.error('[process-broadcast] Recipients save error:', recError)
            }
        }

        // 6. Update Final Status
        console.log('[process-broadcast] Finalizing broadcast log status to completed')
        await supabaseClient
            .from('broadcast_logs')
            .update({
                status: 'completed',
                target_count: targetUsers.length,
                metadata: { finished_at: new Date().toISOString() }
            })
            .eq('id', broadcastId)

        console.log('[process-broadcast] Done.')
        return new Response(JSON.stringify({ message: 'Broadcast completed', count: targetUsers.length }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })

    } catch (error) {
        console.error('[process-broadcast] Global catch error:', error)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})

function generateEmailHtml(user: any, log: any, properties: any[]) {
    const propertyHtml = properties.map(p => `
        <div style="margin-bottom: 30px; border: 1px solid #eee; border-radius: 12px; overflow: hidden; background: white;">
            <img src="${p.images?.[0]}" style="width: 100%; aspect-ratio: 16/9; object-fit: cover;" />
            <div style="padding: 20px;">
                <h3 style="margin: 0 0 10px 0; color: #1a1e2e;">${p.title}</h3>
                <p style="font-size: 18px; font-weight: bold; color: #0066ff; margin: 0 0 10px 0;">${p.price?.toLocaleString()} THB</p>
                <p style="font-size: 14px; color: #666; margin-bottom: 20px;">${p.area?.name}</p>
                <a href="http://pattaya-realestate.com/properties/${p.id}" style="display: inline-block; padding: 10px 20px; background: #1a1e2e; color: white; text-decoration: none; border-radius: 8px; font-weight: bold;">詳細を見る</a>
            </div>
        </div>
    `).join('')

    return `
        <div style="font-family: sans-serif; background-color: #f8fafc; padding: 40px 20px;">
            <div style="max-width: 600px; margin: 0 auto;">
                <h2 style="color: #1a1e2e; text-align: center;">${log.title}</h2>
                <p style="color: #64748b; text-align: center; margin-bottom: 40px;">${log.content}</p>
                ${propertyHtml}
                <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 40px 0;">
                <p style="font-size: 11px; color: #94a3b8; text-align: center;">
                    このメールは新着物件通知設定をされている方に送信されています。<br>
                    配信停止は<a href="http://pattaya-realestate.com/mypage" style="color: #0066ff;">マイページ</a>から行えます。
                </p>
            </div>
        </div>
    `
}

function generateLineFlexMessage(log: any, properties: any[]) {
    const bubbles = properties.slice(0, 10).map(p => ({
        type: "bubble",
        hero: {
            type: "image",
            url: p.images?.[0] || "https://example.com/no-image.jpg",
            size: "full",
            aspectRatio: "20:13",
            aspectMode: "cover"
        },
        body: {
            type: "box",
            layout: "vertical",
            contents: [
                {
                    type: "text",
                    text: p.title,
                    weight: "bold",
                    size: "md",
                    wrap: true
                },
                {
                    type: "box",
                    layout: "baseline",
                    margin: "md",
                    contents: [
                        {
                            type: "text",
                            text: `${p.price?.toLocaleString()} THB`,
                            weight: "bold",
                            size: "lg",
                            color: "#0066ff",
                            flex: 0
                        },
                        {
                            type: "text",
                            text: p.area?.name || "",
                            size: "xs",
                            color: "#999999",
                            align: "end"
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
                    style: "link",
                    height: "sm",
                    action: {
                        type: "uri",
                        label: "詳細を見る",
                        uri: `http://pattaya-realestate.com/properties/${p.id}`
                    }
                }
            ]
        }
    }))

    return {
        type: "flex",
        altText: log.title,
        contents: {
            type: "carousel",
            contents: bubbles
        }
    }
}
