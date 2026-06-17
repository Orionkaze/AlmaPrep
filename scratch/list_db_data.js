const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '..', '.env.local');
if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found!');
  process.exit(1);
}

const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const val = parts.slice(1).join('=').trim();
    env[key] = val;
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY; // Let's check if there's a service role key

console.log('Connecting to:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function inspect() {
  const tables = ['users', 'interviews', 'messages', 'feedback', 'interview_usage'];
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*');
      if (error) {
        console.error(`Error querying table ${table}:`, error);
      } else {
        console.log(`Table ${table} has ${data.length} row(s):`, data);
      }
    } catch (e) {
      console.error(`Exception querying table ${table}:`, e);
    }
  }
}

inspect();
