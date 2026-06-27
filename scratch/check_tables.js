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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function inspectSchema() {
  try {
    console.log('Querying information_schema.tables...');
    // We can use supabase.rpc or a direct SQL query via information_schema if enabled,
    // or try querying known table names.
    // Since standard Supabase REST API doesn't expose raw SQL querying, let's try querying information_schema.columns or informational views if exposed.
    // If PostgREST does not expose information_schema, we can try to fetch from 'vetted_questions' or 'questions' directly to see if they exist.
    
    console.log('Trying to query vetted_questions table...');
    const { data: vqData, error: vqError } = await supabase.from('vetted_questions').select('*').limit(1);
    if (vqError) {
      console.log('vetted_questions query error:', vqError.message);
    } else {
      console.log('vetted_questions exists! Sample row:', vqData);
    }

    console.log('Trying to query questions table...');
    const { data: qData, error: qError } = await supabase.from('questions').select('*').limit(1);
    if (qError) {
      console.log('questions query error:', qError.message);
    } else {
      console.log('questions exists! Sample row:', qData);
    }

  } catch (err) {
    console.error('Error during schema inspection:', err);
  }
}

inspectSchema();
