const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local in the current directory
const envPath = path.join(__dirname, '.env.local');
console.log('Reading env file from:', envPath);

if (!fs.existsSync(envPath)) {
  console.error('.env.local file not found at the project root!');
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

console.log('SUPABASE_URL:', env.NEXT_PUBLIC_SUPABASE_URL);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runTest() {
  try {
    console.log('Fetching auth users...');
    const { data: { users }, error: authError } = await supabase.auth.admin.listUsers();
    if (authError) {
      console.log('Auth query returned error:', authError);
    } else {
      console.log('Total auth users:', users.length);
      users.forEach(u => {
        console.log(`Auth User ID: ${u.id}, Email: ${u.email}, Provider: ${u.app_metadata.provider}`);
      });
    }

    console.log('\nFetching public.users profiles...');
    const { data: profiles, error } = await supabase.from('users').select('*');
    if (error) {
      console.log('Profiles query returned error:', error);
    } else {
      console.log('Total profiles:', profiles.length);
      profiles.forEach(p => {
        console.log(`Profile ID: ${p.id}, Username: ${p.username}, Avatar: ${p.avatar_url}`);
      });
    }
  } catch (err) {
    console.error('Unexpected exception during test:', err);
  }
}

runTest();
