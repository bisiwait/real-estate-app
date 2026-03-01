import { Resend } from 'resend';
import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        console.log('Inquiry Webhook Payload:', JSON.stringify(payload, null, 2));

        // Supabase Webhook payload structure:
        // { type: 'INSERT', table: 'inquiries', record: { ... }, old_record: null, ... }
        const { record } = payload;

        if (!record || !record.property_id) {
            return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
        }

        const supabase = await createAdminClient();

        // 1. Get Property info
        const { data: property, error: propertyError } = await supabase
            .from('properties')
            .select('title, user_id')
            .eq('id', record.property_id)
            .single();

        if (propertyError || !property) {
            console.error('Error fetching property info:', propertyError);
            return NextResponse.json({ error: 'Property not found' }, { status: 404 });
        }

        // 2. Get Agent (Owner) profile info
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('email, full_name')
            .eq('id', property.user_id)
            .single();

        if (profileError || !profile) {
            console.error('Error fetching profile info:', profileError);
            // We can still continue if we have a fallback, or we can use the record info
        }

        const agentEmail = profile?.email || 'onboarding@resend.dev';
        const agentName = profile?.full_name || 'Agent';

        console.log(`Sending inquiry notification to: ${agentEmail} for property: ${property.title}`);

        // 2. Send email via Resend
        const { data, error } = await resend.emails.send({
            from: 'Chonburi Connect <onboarding@resend.dev>',
            to: [agentEmail],
            subject: `【新着】物件「${property.title}」にお問い合わせがありました`,
            html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #1e293b; border-bottom: 2px solid #3b82f6; padding-bottom: 10px;">新着お問い合わせ通知</h2>
          
          <p style="font-size: 16px; color: #475569;">以下の物件に対して新しいお問い合わせがありました：</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
            <p style="margin: 5px 0;"><strong>物件名:</strong> ${property.title}</p>
            <p style="margin: 5px 0;"><strong>物件ID:</strong> ${record.property_id}</p>
          </div>

          <h3 style="color: #1e293b; font-size: 18px; margin-top: 30px;">お問い合わせ内容</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; width: 120px; color: #64748b;">お名前</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; font-weight: bold;">${record.inquirer_name}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">メールアドレス</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${record.inquirer_email}</td>
            </tr>
            <tr>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9; color: #64748b;">電話番号</td>
              <td style="padding: 10px; border-bottom: 1px solid #f1f5f9;">${record.inquirer_phone || 'なし'}</td>
            </tr>
          </table>

          <div style="margin-top: 20px; padding: 15px; background-color: #f1f5f9; border-radius: 8px; font-style: italic; color: #1e293b;">
            "${record.message}"
          </div>

          <div style="margin-top: 40px; text-align: center;">
            <a href="${process.env.NEXT_PUBLIC_SITE_URL}/dashboard" style="background-color: #1e293b; color: white; padding: 12px 25px; text-decoration: none; font-weight: bold; border-radius: 8px;">ダッシュボードで確認する</a>
          </div>
          
          <p style="font-size: 12px; color: #94a3b8; margin-top: 40px; text-align: center;">
            ※このメールはシステムによる自動送信です。心当たりのない場合は破棄してください。
          </p>
        </div>
      `,
        });

        if (error) {
            console.error('Resend Error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ success: true, id: data?.id });
    } catch (err: any) {
        console.error('Inquiry Webhook Error:', err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
