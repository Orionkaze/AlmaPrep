const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

const candidateNames = [
  'vetted_questions',
  'questions',
  'interview_questions',
  'question_bank',
  'domain_questions',
  'program_questions',
  'challenges',
  'users',
  'interviews'
];

async function checkCandidates() {
  for (const name of candidateNames) {
    const { data, error } = await supabase.from(name).select('*').limit(1);
    if (error) {
      console.log(`Table "${name}":`, error.message);
    } else {
      console.log(`Table "${name}" EXISTS! Column keys:`, Object.keys(data[0] || {}));
    }
  }
}

checkCandidates();
