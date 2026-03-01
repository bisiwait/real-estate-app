import { createClient } from '@supabase/supabase-js'
import * as path from 'path'
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

// Need service role key to bypass RLS for insert if anonymous inserts are not allowed
// Let's check if there is a service role key, otherwise use anon key
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || supabaseKey

const supabase = createClient(supabaseUrl, serviceKey)

async function main() {
    const { data: region, error: regionError } = await supabase
        .from('regions')
        .select('id')
        .eq('slug', 'pattaya')
        .single()

    if (regionError) {
        console.error('Error fetching Pattaya region:', regionError)
        process.exit(1)
    }

    const { data: existing } = await supabase
        .from('areas')
        .select('id')
        .eq('slug', 'south-pattaya')
        .single()

    if (existing) {
        console.log('South Pattaya already exists in the database.')
        process.exit(0)
    }

    const { data: newArea, error: insertError } = await supabase
        .from('areas')
        .insert({
            region_id: region.id,
            name: 'South Pattaya',
            slug: 'south-pattaya'
        })
        .select()

    if (insertError) {
        console.error('Error inserting South Pattaya:', insertError)
        process.exit(1)
    }

    console.log('Successfully inserted South Pattaya:', newArea[0].name)
}

main()
