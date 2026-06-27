const fs = require('fs');
const path = require('path');

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

const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/`;
const apikey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function fetchSchema() {
  try {
    console.log('Fetching Supabase schema OpenAPI definition from:', url);
    const response = await fetch(url, {
      headers: {
        'apikey': apikey,
        'Authorization': `Bearer ${apikey}`
      }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch schema: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    console.log('\n--- Exponent Tables & Definitions ---');
    if (data.definitions) {
      const tables = Object.keys(data.definitions);
      console.log('Found tables:', tables);
      
      for (const table of tables) {
        console.log(`\nTable: ${table}`);
        const properties = data.definitions[table].properties || {};
        const columns = Object.keys(properties).map(col => {
          return `${col} (${properties[col].type || 'unknown'})`;
        });
        console.log('Columns:', columns.join(', '));
      }
    } else {
      console.log('No definitions found in OpenAPI spec.');
    }
  } catch (err) {
    console.error('Error fetching schema:', err);
  }
}

fetchSchema();
