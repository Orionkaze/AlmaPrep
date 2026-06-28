const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '..', 'data', 'interview_mock_db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

// Find the active Two Sum session
const session = db.interview_sessions.find(s => s.id === '3f9311d4-9b3a-48f0-917d-5252737f28db');
if (!session) {
  console.log('Session not found');
  process.exit(0);
}

const fileContent = session.current_codebase['solution.js'];
const lastMsg = session.conversation[session.conversation.length - 1];
const diff = lastMsg.content.proposed_changes[0];

const original = diff.original;
console.log('--- fileContent JSON representation ---');
console.log(JSON.stringify(fileContent));
console.log('\n--- original JSON representation ---');
console.log(JSON.stringify(original));

const normalizeLineEndings = (str) => str.replace(/\r\n/g, '\n');
const normalizedContent = normalizeLineEndings(fileContent);
const normalizedOriginal = normalizeLineEndings(original);

const cleanOriginal = normalizedOriginal.replace(/\s+/g, '');
const cleanContent = normalizedContent.replace(/\s+/g, '');

console.log('\n--- collapsed original string ---');
console.log(cleanOriginal);
console.log('\n--- collapsed content string ---');
console.log(cleanContent);

console.log('\nDoes collapsed content contain collapsed original?', cleanContent.includes(cleanOriginal));

// Let's debug index by index
let origIdx = 0;
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < normalizedContent.length; i++) {
  const char = normalizedContent[i];
  if (/\s/.test(char)) {
    continue;
  }

  if (char === cleanOriginal[origIdx]) {
    if (origIdx === 0) {
      startIdx = i;
    }
    origIdx++;
    if (origIdx === cleanOriginal.length) {
      endIdx = i + 1;
      break;
    }
  } else {
    if (startIdx !== -1) {
      // Print first mismatch
      console.log(`Mismatch at content char "${char}" (index ${i}) vs original char "${cleanOriginal[origIdx]}" (index ${origIdx})`);
      i = startIdx;
      startIdx = -1;
      origIdx = 0;
    }
  }
}

console.log(`\nMatch results: startIdx=${startIdx}, endIdx=${endIdx}, matchedLength=${origIdx} (out of ${cleanOriginal.length})`);
