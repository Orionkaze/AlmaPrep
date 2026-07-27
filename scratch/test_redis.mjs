import fs from 'fs';
import path from 'path';
import { Redis } from '@upstash/redis';

// Simple parser for .env.local
const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
for (const line of envContent.split('\n')) {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let value = match[2] || '';
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1);
    }
    env[match[1]] = value.trim();
  }
}

const url = env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_URL;
const token = env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;

console.log('Redis URL:', url ? 'Found' : 'Not found');
console.log('Redis Token:', token ? 'Found' : 'Not found');

if (!url || !token) {
  console.error('Error: UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN is missing!');
  process.exit(1);
}

const redis = new Redis({ url, token });

try {
  console.log('Testing set/get...');
  await redis.set('test_key', 'hello');
  const val = await redis.get('test_key');
  console.log('Get value:', val);

  console.log('Testing pipeline with ZSET rate limiting logic...');
  const key = 'test_ratelimit_zset';
  const now = Date.now();
  const windowMs = 60000;
  const cutoff = now - windowMs;
  const member = `${now}:${Math.random()}`;

  const p = redis.pipeline();
  p.zremrangebyscore(key, 0, cutoff);
  p.zadd(key, { score: now, member });
  p.zcard(key);
  p.pexpire(key, windowMs);

  const results = await p.exec();
  console.log('Pipeline execution results:', results);

  // Clean up
  await redis.del('test_key');
  await redis.del(key);
  console.log('Cleanup done. Connection successful!');
} catch (err) {
  console.error('Redis connection or command execution failed:', err);
  process.exit(1);
}
