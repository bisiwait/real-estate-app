import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

function getEnv(key) {
    try {
        const content = fs.readFileSync('.env.local', 'utf8')
        const lines = content.split('\n')
        for (const line of lines) {
            if (line.startsWith(key + '=')) {
                return line.split('=')[1].trim()
            }
        }
    } catch (e) { }
    return null
}

const SUPABASE_URL = getEnv('NEXT_PUBLIC_SUPABASE_URL')
const SUPABASE_KEY = getEnv('SUPABASE_SERVICE_ROLE_KEY')
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)

async function checkSchema() {
    const columns = [
        'project_facilities',
        'land_area',
        'total_units',
        'total_buildings',
        'developer',
        'is_presale'
    ];

    const results = {};
    for (const col of columns) {
        const { error } = await supabase
            .from('properties')
            .select(col)
            .limit(1);

        if (error) {
            results[col] = 'MISSING';
        } else {
            results[col] = 'EXISTS';
        }
    }

    console.log(JSON.stringify(results, null, 2));
}

checkSchema()
