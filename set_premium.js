require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function setPremium() {
    const { data: users, error: err } = await supabase.from('profiles').select('id, email, is_admin').eq('email', 'agent@example.com');
    if (err || !users || users.length === 0) {
        console.error('User not found:', err);
        return;
    }

    const userId = users[0].id;
    console.log('Found user:', userId);

    const { error: updateErr } = await supabase.from('profiles').update({
        plan: 'premium',
        available_credits: 50
    }).eq('id', userId);

    if (updateErr) {
        console.error('Update failed:', updateErr);
    } else {
        console.log('Successfully updated agent@example.com to premium plan with 50 credits.');
    }
}

setPremium();
