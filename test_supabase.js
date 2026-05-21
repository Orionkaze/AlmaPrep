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
console.log('SUPABASE_ANON_KEY:', env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function runTest() {
  try {
    console.log('Testing Supabase connection...');
    // Attempt a simple query that hits the API gateway
    const { data, error } = await supabase.from('users').select('*').limit(1);
    
    if (error) {
      console.log('Query returned an error:', error);
    } else {
      console.log('Query completed successfully. Data:', data);
    }
  } catch (err) {
    console.error('Unexpected exception during test:', err);
  }
}

runTest();
