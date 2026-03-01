import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkSchema() {
    console.log('Checking profiles table...');
    const { data: profiles, error: err1 } = await supabase.from('profiles').select('plan').limit(1);
    console.log('Profiles plan:', profiles, err1);

    console.log('Checking properties table...');
    const { data: props, error: err2 } = await supabase.from('properties').select('is_presale').limit(1);
    console.log('Properties is_presale:', props, err2);
}

checkSchema()
