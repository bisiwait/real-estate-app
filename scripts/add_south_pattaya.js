import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config()

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials in .env')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    // Get Pattaya region ID
    const { data: region, error: regionError } = await supabase
        .from('regions')
        .select('id')
        .eq('slug', 'pattaya')
        .single()

    if (regionError) {
        console.error('Error fetching Pattaya region:', regionError)
        process.exit(1)
    }

    // Check if South Pattaya already exists
    const { data: existing, error: existingError } = await supabase
        .from('areas')
        .select('id')
        .eq('slug', 'south-pattaya')
        .single()

    if (existing) {
        console.log('South Pattaya already exists in the database.')
        process.exit(0)
    }

    // Insert South Pattaya
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
