import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function testPresale() {
    console.log('Fetching agent@example.com...')
    const { data: users, error: err } = await supabase.from('profiles').select('id, email').eq('email', 'agent@example.com')
    if (err || !users || users.length === 0) {
        console.error('User not found:', err)
        return
    }

    const userId = users[0].id
    console.log('Found user:', userId)

    // Set user to premium
    await supabase.from('profiles').update({
        plan: 'premium',
        available_credits: 50
    }).eq('id', userId)
    console.log('User upgraded to premium with 50 credits.')

    // Add a mock Project
    const { data: areaData } = await supabase.from('areas').select('id').limit(1).single()
    const areaId = areaData?.id || 'd3dd78f2-89b5-412e-9d22-13eb674d8ff2'

    console.log('Creating mock presale project...')
    const { data: project, error: projErr } = await supabase.from('projects').insert({
        name: 'The Grand Presale Residence',
        area_id: areaId,
        address: 'Pattaya Second Road',
        property_type: 'Condo',
        year_built: '2028',
        total_floors: 50
    }).select().single()

    if (projErr) {
        console.error('Project creation failed:', projErr)
    }

    // Add a mock Presale Property
    console.log('Creating mock presale property...')
    const { data: property, error: propErr } = await supabase.from('properties').insert({
        user_id: userId,
        title: '【プレセール激レア物件】The Grand 予約受付開始！',
        description: '超高層コンドミニアムのプレセールです。海が見える最高層階。',
        is_for_rent: false,
        is_for_sale: true,
        sale_price: 3500000,
        area_id: areaId,
        project_id: project?.id || null,
        building_name: 'The Grand Presale Residence',
        images: ['https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1000&q=80'],
        tags: ['高層階（オーシャンビュー期待）', 'ペット可', 'EV充電器あり'],
        status: 'approved', // already approved so we can see it
        property_type: 'Condo',
        sqm: 45,
        bedrooms: 1,
        bathrooms: 1,
        ownership_type: 'Foreign Quota',
        is_presale: true,
        completion_date: '2028年3月',
        payment_plan: '予約金：10万THB\n契約時：20%\n工事中：30%\n完成時：50%',
        construction_status: 'under_construction',
        has_bathtub: true
    }).select().single()

    if (propErr) {
        console.error('Property creation failed:', propErr)
    } else {
        console.log('Successfully created presale property:', property?.id)
        console.log('View it at: http://localhost:3000/properties/' + property?.id)
    }
}

testPresale()
