// supabase/functions/notify-inquirer/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        )

        const { record } = await req.json()
        // record is the new inquiry_reply

        // 1. Get inquiry and property details
        const { data: inquiry, error: inquiryError } = await supabaseClient
            .from('inquiries')
            .select('*, property:properties(title)')
            .eq('id', record.inquiry_id)
            .single()

        if (inquiryError || !inquiry) throw new Error('Inquiry not found')

        const resendApiKey = Deno.env.get('RESEND_API_KEY')

        console.log(`Processing reply notification for inquiry: ${inquiry.id}`)
        console.log(`Target email: ${inquiry.inquirer_email}`)

        if (!resendApiKey) {
            console.warn('RESEND_API_KEY is not set. Email will not be sent, but process logged.')
            return new Response(JSON.stringify({ message: 'API Key missing, logged instead' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            })
        }

        // 2. Send email via Resend
        const response = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${resendApiKey}`,
            },
            body: JSON.stringify({
                from: 'Pattaya Real Estate <notifications@resend.dev>', // Update with verified domain
                to: inquiry.inquirer_email,
                subject: `【返信】「${inquiry.property.title}」についてのお問い合わせ`,
                html: `
                    <div style="font-family: sans-serif; line-height: 1.6; color: #333;">
                        <h2>${inquiry.inquirer_name} 様</h2>
                        <p>お問い合わせいただいた物件「<strong>${inquiry.property.title}</strong>」について、担当者より返信が届きました。</p>
                        
                        <div style="background-color: #f9f9f9; padding: 20px; border-radius: 10px; border: 1px solid #eee; margin: 20px 0;">
                            <p style="margin-top: 0; font-weight: bold; color: #666;">返信内容:</p>
                            <p style="white-space: pre-wrap;">${record.message}</p>
                        </div>
                        
                        <p>※本メールはシステムによる自動送信です。返信される場合は、直接担当者の連絡先、またはサイトのお問い合わせフォームをご利用ください。</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="font-size: 12px; color: #999;">Pattaya Real Estate System</p>
                    </div>
                `,
            }),
        })

        const resData = await response.json()
        console.log('Resend response:', resData)

        return new Response(JSON.stringify({ message: 'Notification sent', id: resData.id }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        console.error('Error in notify-inquirer:', error.message)
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
