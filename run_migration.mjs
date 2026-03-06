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

async function runMigration() {
    const migrationFile = 'supabase/migrations/20260306_add_developer_to_projects.sql';
    console.log(`Running migration: ${migrationFile}`);

    try {
        const sql = fs.readFileSync(migrationFile, 'utf8');

        // Use RPC to execute SQL or try a simple query if RPC isn't available
        // Note: Supabase doesn't have a direct "exec sql" JS method for arbitrary SQL
        // Usually, we'd use the CLI. For now, I'll inform the user.
        console.log('SQL content:');
        console.log(sql);
        console.log('\n--- IMPORTANT ---');
        console.log('Please execute the above SQL in the Supabase Dashboard SQL Editor.');
    } catch (e) {
        console.error('Error reading migration file:', e.message);
    }
}

runMigration()
