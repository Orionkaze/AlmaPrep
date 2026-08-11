const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.\-_]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) {
      val = val.slice(1, -1);
    }
    if (val.startsWith("'") && val.endsWith("'")) {
      val = val.slice(1, -1);
    }
    env[key] = val.trim();
  }
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const tables = [
  'users',
  'interviews',
  'messages',
  'feedback',
  'behavioral_analysis',
  'badges',
  'user_badges',
  'activity_log'
];

async function checkTables() {
  console.log("--- TABLE STATUS CHECKS ---");
  for (const table of tables) {
    try {
      const { data, error, count } = await supabase.from(table).select('*', { count: 'exact', head: true });
      if (error) {
        console.log(`Table '${table}': ERROR:`, error.message, `(Code: ${error.code})`);
      } else {
        console.log(`Table '${table}': SUCCESS (Row count: ${count})`);
      }
    } catch (e) {
      console.log(`Table '${table}': EXCEPTION:`, e.message);
    }
  }

  console.log("\n--- RECENT INTERVIEWS ---");
  try {
    const { data, error } = await supabase
      .from("interviews")
      .select("id, user_id, category, status, created_at")
      .order("created_at", { ascending: false })
      .limit(5);
    
    if (error) {
      console.log("Failed to query interviews:", error.message);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log("Interview query exception:", e.message);
  }

  console.log("\n--- SEEDED BADGES ---");
  try {
    const { data, error } = await supabase
      .from("badges")
      .select("slug, name")
      .limit(5);
    
    if (error) {
      console.log("Failed to query seeded badges:", error.message);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log("Badges query exception:", e.message);
  }

  console.log("\n--- EARNED BADGES ---");
  try {
    const { data, error } = await supabase
      .from("user_badges")
      .select("*")
      .limit(5);
    
    if (error) {
      console.log("Failed to query user_badges:", error.message);
    } else {
      console.log(JSON.stringify(data, null, 2));
    }
  } catch (e) {
    console.log("User badges query exception:", e.message);
  }
}

checkTables();
