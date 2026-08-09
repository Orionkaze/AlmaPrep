const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
console.log('Reading env file from:', envPath);
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

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing SUPABASE URL or SERVICE KEY");
  process.exit(1);
}

const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function run() {
  console.log("Fetching auth users...");
  const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
  if (authError) {
    console.error("Failed to list auth users:", authError.message);
  } else {
    console.log("Total auth users:", authData.users.length);
    authData.users.forEach(u => {
      console.log(`Auth User ID: ${u.id}, Email: ${u.email}, Provider: ${u.app_metadata?.provider}, Providers: ${JSON.stringify(u.app_metadata?.providers)}`);
    });
  }

  console.log("\nFetching public.users profiles...");
  const { data: profiles, error: profileError } = await supabase.from('users').select('*');
  if (profileError) {
    console.error("Failed to fetch public.users:", profileError.message);
  } else {
    console.log("Total profiles:", profiles.length);
    profiles.forEach(p => {
      console.log(`Profile ID: ${p.id}, Username: ${p.username}, Avatar: ${p.avatar_url}`);
    });
  }
}

run();
