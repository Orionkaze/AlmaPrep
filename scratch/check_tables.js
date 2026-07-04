const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local in the current directory
const envPath = path.join(__dirname, '..', '.env.local');
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const tables = [
  'users',
  'interviews',
  'messages',
  'feedback',
  'interview_usage',
  'challenges',
  'interview_sessions',
  'interview_reports',
  'github_analysis',
  'behavioral_analysis',
  'coding_solutions'
];

async function checkTables() {
  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('*').limit(1);
      if (error) {
        console.log(`Table '${table}': ERROR:`, error.message, `(Code: ${error.code})`);
      } else {
        console.log(`Table '${table}': SUCCESS (Data length: ${data.length})`);
      }
    } catch (e) {
      console.log(`Table '${table}': EXCEPTION:`, e.message);
    }
  }
}

checkTables();
