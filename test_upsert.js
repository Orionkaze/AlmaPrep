const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    env[parts[0].trim()] = parts.slice(1).join('=').trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function runUpsert() {
  const userId = '471ab51d-3dc4-4d90-9f5c-568c2a6e80e0';
  const username = 'akshit123';
  const avatarUrl = 'laptop-code';

  console.log(`Attempting upsert for userId: ${userId}, username: ${username}, avatarUrl: ${avatarUrl}`);

  const { data, error } = await supabase
    .from('users')
    .upsert(
      {
        id: userId,
        username: username,
        avatar_url: avatarUrl,
      },
      { onConflict: 'id' }
    );

  if (error) {
    console.error('Upsert failed with error:', error);
  } else {
    console.log('Upsert succeeded! Data returned:', data);
  }
}

runUpsert();
