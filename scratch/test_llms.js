const fs = require('fs');
const path = require('path');

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

async function testGroqJson() {
  const apiKey = env.GROQ_API_KEY;
  const model = env.GROQ_INTERVIEW_MODEL || "openai/gpt-oss-120b";
  console.log(`\n--- Testing Groq JSON (Model: ${model}) ---`);
  if (!apiKey) return;
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "You are an assistant. Respond in JSON." },
          { role: "user", content: "Return a JSON object with key 'status' value 'ok'." }
        ],
        temperature: 0.7,
        response_format: { type: "json_object" }
      })
    });
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`Response: ${text.slice(0, 500)}`);
  } catch (err) {
    console.error("Groq JSON test failed:", err);
  }
}

async function testGeminiModel(modelName) {
  const apiKey = env.GEMINI_API_KEY;
  console.log(`\n--- Testing Gemini (Model: ${modelName}) ---`);
  if (!apiKey) return;
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Hello" }] }]
      })
    });
    console.log(`Status: ${response.status} ${response.statusText}`);
    const text = await response.text();
    console.log(`Response: ${text.slice(0, 500)}`);
  } catch (err) {
    console.error(`Gemini ${modelName} test failed:`, err);
  }
}

async function run() {
  await testGroqJson();
  await testGeminiModel("gemini-1.5-pro");
  await testGeminiModel("gemini-1.5-flash");
  await testGeminiModel("gemini-2.5-flash");
}

run();
