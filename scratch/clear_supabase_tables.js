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
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || supabaseUrl.includes('evdfkeikrrsdthnekrrz.supabase.co')) {
  console.log('Using placeholder/mock URL. Database clearing script skipped for remote DB.');
  process.exit(0);
}

console.log('Connecting to Supabase at:', supabaseUrl);
const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey);

async function clearDatabase() {
  console.log('Clearing database tables...');
  
  // Table deletion order to avoid foreign key violations:
  // 1. messages, feedback (reference interviews)
  // 2. interviews (references users)
  // 3. interview_usage (references users)
  // 4. users
  
  const tables = ['feedback', 'messages', 'interviews', 'interview_usage', 'users'];
  
  for (const table of tables) {
    console.log(`Clearing table: ${table}`);
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000'); // Delete everything
    if (error) {
      console.error(`Error clearing table ${table}:`, error);
    } else {
      console.log(`Successfully cleared table ${table}`);
    }
  }
  
  console.log('Database truncation completed.');
}

clearDatabase();
