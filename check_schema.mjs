import { createClient } from '@supabase/supabase-js'
import fs from 'fs'

function getEnv(key) {
    try {
        const content = fs.readFileSync('.env.local', 'utf8')
        const lines = content.split(/\r?\n/)
        for (const line of lines) {
            const trimmed = line.trim()
            if (trimmed.startsWith(key + '=')) {
                return trimmed.split('=')[1].trim()
            }
        }
    } catch (e) {
        console.error(`Error reading .env.local: ${e.message}`)
    }
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
