import fs from 'fs'
import pg from 'pg'

const envText = fs.readFileSync('.env.local', 'utf8')
const env = {}
for (const line of envText.split(/\r?\n/)) {
  if (!line || line.startsWith('#') || !line.includes('=')) continue
  const i = line.indexOf('=')
  env[line.slice(0, i)] = line.slice(i + 1).trim().replace(/^["']|["']$/g, '')
}

const dbUrl = env.SUPABASE_DB_URL || env.DATABASE_URL
if (!dbUrl) {
  console.error('SUPABASE_DB_URL or DATABASE_URL required in .env.local to apply migrations')
  process.exit(1)
}

const sql = fs.readFileSync(
  'supabase/migrations/20260608120000_fix_profiles_rls_infinite_recursion.sql',
  'utf8'
)

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
try {
  await client.query(sql)
  console.log('Migration applied OK')
} finally {
  await client.end()
}

// verify anon read
import { createClient } from '@supabase/supabase-js'
const anon = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
const p = await anon.from('properties').select('id').eq('status', 'published').limit(1)
console.log('anon verify:', p.error?.message ?? 'ok', p.data?.length ?? 0)
