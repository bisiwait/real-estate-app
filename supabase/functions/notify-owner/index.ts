// supabase/functions/notify-owner/index.ts
// This function is triggered by an INSERT into the 'inquiries' table.

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

        // 1. Get owner information
        const { data: ownerProfile, error: profileError } = await supabaseClient
            .from('profiles')
            .select('id, (SELECT email FROM auth.users WHERE id = profiles.id LIMIT 1)')
            .eq('id', record.owner_id)
            .single()

        if (profileError || !ownerProfile) throw new Error('Owner not found')

        // 2. Prepare Email Notification (Example using Resend or similar)
        // NOTE: This is a template. You need to configure your email provider.
        console.log(`Sending notification to owner: ${record.owner_id}`)

        // Example:
        /*
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${Deno.env.get('RESEND_API_KEY')}`,
          },
          body: JSON.stringify({
            from: 'Real Estate System <notifications@example.com>',
            to: ownerProfile.email,
            subject: '【新着】物件にお問い合わせが届きました',
            html: `
              <p>${record.inquirer_name} 様からお問い合わせが届きました。</p>
              <p>詳細はダッシュボードをご確認ください。</p>
              <hr>
              <p>お問い合わせ内容概要:</p>
              <p>${record.message.substring(0, 100)}...</p>
            `,
          }),
        })
        */

        return new Response(JSON.stringify({ message: 'Notification process initiated' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        })
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        })
    }
})
