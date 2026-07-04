const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local in the current directory
const envPath = path.join(__dirname, '..', '.env.local');
console.log('Reading env file from:', envPath);

const env = {};
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      env[key] = val;
    }
  });
}

const mockDbPath = path.join(__dirname, '..', 'data', 'interview_mock_db.json');

const challenges = [
  {
    "id": "f1a8c9b3-4f9e-4e3a-96ad-d62fb5291b98",
    "title": "Fix the Broken Authentication",
    "challenge_type": "bug_fix",
    "difficulty": "medium",
    "description": "Users are reporting they cannot log in. The authentication middleware is failing silently — valid tokens are being rejected and the server crashes on missing tokens. Identify every bug and fix them. Consider error handling, token format, and security best practices.",
    "starter_code": {
      "middleware/auth.js": "const jwt = require('jsonwebtoken');\n\nconst authenticate = (req, res, next) => {\n  const token = req.headers['authorization'];\n  const decoded = jwt.verify(token, process.env.JWT_SECRET);\n  req.user = decoded;\n  next();\n};\n\nmodule.exports = authenticate;",
      "routes/user.js": "const express = require('express');\nconst authenticate = require('../middleware/auth');\nconst router = express.Router();\n\nrouter.get('/profile', authenticate, (req, res) => {\n  res.json({ user: req.user });\n});\n\nmodule.exports = router;"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Returns 401 when no token provided", "expects": "401" },
      { "id": "t2", "description": "Returns 401 when token is malformed", "expects": "401" },
      { "id": "t3", "description": "Returns 401 when token is expired", "expects": "401" },
      { "id": "t4", "description": "Returns 200 and user data when token is valid", "expects": "200" },
      { "id": "t5", "description": "Does not crash on missing Authorization header", "expects": "no_crash" }
    ],
    "expected_outcomes": {
      "bugs_to_find": [
        "No try/catch around jwt.verify — crashes on invalid tokens",
        "Token not stripped of 'Bearer ' prefix",
        "No check for missing authorization header",
        "No 401 response sent on failure"
      ]
    }
  },
  {
    "id": "e1a2b3c4-5d6e-7f8a-9b0c-1d2e3f4a5b6c",
    "title": "Two Sum",
    "challenge_type": "feature",
    "difficulty": "easy",
    "description": "Given an array of integers and a target sum, return the indices of the two numbers that add up to the target. Each input has exactly one solution. You may not use the same element twice. Expected time complexity: O(n).",
    "starter_code": {
      "solution.js": "function twoSum(nums, target) {\n  // Your solution here\n}\n\nmodule.exports = { twoSum };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "twoSum([2,7,11,15], 9) === [0,1]", "expects": "0,1" },
      { "id": "t2", "description": "twoSum([3,2,4], 6) === [1,2]", "expects": "1,2" },
      { "id": "t3", "description": "twoSum([3,3], 6) === [0,1]", "expects": "0,1" }
    ],
    "expected_outcomes": { "approach": "HashMap for O(n) solution", "time_complexity": "O(n)", "space_complexity": "O(n)" }
  },
  {
    "id": "a2b3c4d5-e6f7-8a9b-0c1d-2e3f4a5b6c7d",
    "title": "Valid Parentheses",
    "challenge_type": "feature",
    "difficulty": "easy",
    "description": "Given a string containing only '(', ')', '{', '}', '[', ']', determine if the input string is valid. Brackets must close in the correct order.",
    "starter_code": {
      "solution.js": "function isValid(s) {\n  // Your solution here\n}\n\nmodule.exports = { isValid };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "isValid('()') === true", "expects": "true" },
      { "id": "t2", "description": "isValid('()[}') === false", "expects": "false" },
      { "id": "t3", "description": "isValid('{[]}') === true", "expects": "true" }
    ],
    "expected_outcomes": { "approach": "Stack-based", "time_complexity": "O(n)", "space_complexity": "O(n)" }
  },
  {
    "id": "b3c4d5e6-f7a8-9b0c-1d2e-3f4a5b6c7d8e",
    "title": "Longest Substring Without Repeating Characters",
    "challenge_type": "feature",
    "difficulty": "medium",
    "description": "Given a string, find the length of the longest substring without repeating characters. This is a classic sliding window problem asked at Google, Amazon, and Meta.",
    "starter_code": {
      "solution.js": "function lengthOfLongestSubstring(s) {\n  // Your solution here\n}\n\nmodule.exports = { lengthOfLongestSubstring };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "lengthOfLongestSubstring('abcabcbb') === 3", "expects": "3" },
      { "id": "t2", "description": "lengthOfLongestSubstring('bbbbb') === 1", "expects": "1" },
      { "id": "t3", "description": "lengthOfLongestSubstring('pwwkew') === 3", "expects": "3" }
    ],
    "expected_outcomes": { "approach": "Sliding window with HashMap", "time_complexity": "O(n)", "space_complexity": "O(n)" }
  },
  {
    "id": "c4d5e6f7-a8b9-0c1d-2e3f-4a5b6c7d8e9f",
    "title": "Maximum Subarray (Kadane's Algorithm)",
    "challenge_type": "feature",
    "difficulty": "medium",
    "description": "Given an integer array, find the contiguous subarray with the largest sum and return its sum. This is one of the most frequently asked Amazon interview questions.",
    "starter_code": {
      "solution.js": "function maxSubArray(nums) {\n  // Your solution here\n}\n\nmodule.exports = { maxSubArray };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "maxSubArray([-2,1,-3,4,-1,2,1,-5,4]) === 6", "expects": "6" },
      { "id": "t2", "description": "maxSubArray([1]) === 1", "expects": "1" },
      { "id": "t3", "description": "maxSubArray([-1,-2,-3]) === -1", "expects": "-1" }
    ],
    "expected_outcomes": { "approach": "Kadane's algorithm", "time_complexity": "O(n)", "space_complexity": "O(1)" }
  },
  {
    "id": "d5e6f7a8-b90c-1d2e-3f4a-5b6c7d8e9f0a",
    "title": "Binary Search Tree — Validate",
    "challenge_type": "feature",
    "difficulty": "medium",
    "description": "Given the root of a binary tree, determine if it is a valid binary search tree. A valid BST requires all left subtree values to be less than the node, and all right subtree values to be greater.",
    "starter_code": {
      "solution.js": "function isValidBST(root, min = -Infinity, max = Infinity) {\n  // Your solution here\n}\n\nmodule.exports = { isValidBST };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Valid BST [2,1,3] returns true", "expects": "true" },
      { "id": "t2", "description": "Invalid BST [5,1,4,null,null,3,6] returns false", "expects": "false" }
    ],
    "expected_outcomes": { "approach": "Recursive with min/max bounds", "time_complexity": "O(n)", "space_complexity": "O(h)" }
  },
  {
    "id": "e6f7a8b9-0c1d-2e3f-4a5b-6c7d8e9f0a1b",
    "title": "Number of Islands",
    "challenge_type": "feature",
    "difficulty": "medium",
    "description": "Given a 2D grid of '1's (land) and '0's (water), count the number of islands. An island is surrounded by water and formed by connecting adjacent lands horizontally or vertically. Classic Google/Amazon BFS/DFS question.",
    "starter_code": {
      "solution.js": "function numIslands(grid) {\n  // Your solution here\n}\n\nmodule.exports = { numIslands };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Single island grid returns 1", "expects": "1" },
      { "id": "t2", "description": "Three separate islands returns 3", "expects": "3" },
      { "id": "t3", "description": "All water returns 0", "expects": "0" }
    ],
    "expected_outcomes": { "approach": "BFS or DFS flood fill", "time_complexity": "O(m\u00d7n)", "space_complexity": "O(m\u00d7n)" }
  },
  {
    "id": "f7a8b90c-1d2e-3f4a-5b6c-7d8e9f0a1b2c",
    "title": "Merge K Sorted Lists",
    "challenge_type": "feature",
    "difficulty": "hard",
    "description": "You are given an array of k linked lists, each sorted in ascending order. Merge all the linked lists into one sorted linked list. This is a classic hard-level question asked at Google, Meta, and Microsoft.",
    "starter_code": {
      "solution.js": "class ListNode {\n  constructor(val, next = null) {\n    this.val = val;\n    this.next = next;\n  }\n}\n\nfunction mergeKLists(lists) {\n  // Your solution here\n}\n\nmodule.exports = { mergeKLists, ListNode };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Merges [[1,4,5],[1,3,4],[2,6]] into [1,1,2,3,4,4,5,6]", "expects": "1,1,2,3,4,4,5,6" },
      { "id": "t2", "description": "Empty input returns null", "expects": "null" }
    ],
    "expected_outcomes": { "approach": "Min-heap or divide and conquer", "time_complexity": "O(n log k)", "space_complexity": "O(k)" }
  },
  {
    "id": "a8b90c1d-2e3f-4a5b-6c7d-8e9f0a1b2c3d",
    "title": "Word Break II",
    "challenge_type": "feature",
    "difficulty": "hard",
    "description": "Given a string s and a dictionary of strings wordDict, add spaces in s to construct a sentence where each word is a valid dictionary word. Return all such possible sentences. Asked at Google and Amazon for senior roles.",
    "starter_code": {
      "solution.js": "function wordBreak(s, wordDict) {\n  // Your solution here\n}\n\nmodule.exports = { wordBreak };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "wordBreak('catsanddog', ['cat','cats','and','sand','dog']) includes 'cats and dog'", "expects": "cats and dog" },
      { "id": "t2", "description": "No valid break returns []", "expects": "" }
    ],
    "expected_outcomes": { "approach": "DFS with memoization", "time_complexity": "O(n^2 * 2^n)", "space_complexity": "O(n * 2^n)" }
  },
  {
    "id": "b90c1d2e-3f4a-5b6c-7d8e-9f0a1b2c3d4e",
    "title": "Trapping Rain Water",
    "challenge_type": "performance",
    "difficulty": "hard",
    "description": "Given n non-negative integers representing an elevation map where the width of each bar is 1, compute how much water it can trap after raining. One of the most iconic hard problems asked at every top MNC.",
    "starter_code": {
      "solution.js": "function trap(height) {\n  // Your solution here\n  // Aim for O(n) time, O(1) space\n}\n\nmodule.exports = { trap };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "trap([0,1,0,2,1,0,1,3,2,1,2,1]) === 6", "expects": "6" },
      { "id": "t2", "description": "trap([4,2,0,3,2,5]) === 9", "expects": "9" }
    ],
    "expected_outcomes": { "approach": "Two pointer O(n) O(1)", "time_complexity": "O(n)", "space_complexity": "O(1)" }
  },
  {
    "id": "c0d1e2f3-a4b5-6c7d-8e9f-0a1b2c3d4e5f",
    "title": "Race Condition in Order Processing",
    "challenge_type": "bug_fix",
    "difficulty": "hard",
    "description": "An e-commerce platform is occasionally processing the same order twice, charging customers double. The bug is a race condition in the order processing service. Identify and fix it using proper locking or idempotency patterns.",
    "starter_code": {
      "orderService.js": "const processedOrders = new Set();\n\nasync function processOrder(orderId, chargeCustomer) {\n  if (processedOrders.has(orderId)) return;\n  await chargeCustomer(orderId);\n  processedOrders.add(orderId);\n}\n\nmodule.exports = { processOrder };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Concurrent calls with same orderId only charge once", "expects": "1" },
      { "id": "t2", "description": "Different orderIds are both processed", "expects": "2" }
    ],
    "expected_outcomes": { "bugs_to_find": ["Race condition between has() check and add()", "Solution: optimistic lock or DB-level unique constraint or mutex"] }
  },
  {
    "id": "d1e2f3a4-b56c-7d8e-9f0a-1b2c3d4e5f6a",
    "title": "SQL Injection Vulnerability",
    "challenge_type": "security",
    "difficulty": "medium",
    "description": "A user search endpoint is vulnerable to SQL injection. An attacker can manipulate the query to dump the entire users table or bypass authentication. Identify the vulnerability and fix it using parameterized queries.",
    "starter_code": {
      "routes/search.js": "const db = require('../db');\n\nasync function searchUser(req, res) {\n  const { username } = req.query;\n  const result = await db.query(`SELECT * FROM users WHERE username = '${username}'`);\n  res.json(result.rows);\n}\n\nmodule.exports = { searchUser };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Injection payload returns no extra rows", "expects": "safe" },
      { "id": "t2", "description": "Valid username returns correct user", "expects": "found" }
    ],
    "expected_outcomes": { "fix": "Use parameterized queries: db.query('SELECT * FROM users WHERE username = $1', [username])" }
  },
  {
    "id": "e2f3a4b5-6c7d-8e9f-0a1b-2c3d4e5f6a7b",
    "title": "Broken Access Control — IDOR",
    "challenge_type": "security",
    "difficulty": "hard",
    "description": "Users can access other users' private data by changing the ID in the URL. This is an Insecure Direct Object Reference (IDOR) vulnerability — one of the OWASP Top 10. Fix the endpoint to enforce ownership checks.",
    "starter_code": {
      "routes/documents.js": "const db = require('../db');\n\nasync function getDocument(req, res) {\n  const { id } = req.params;\n  const doc = await db.query('SELECT * FROM documents WHERE id = $1', [id]);\n  if (!doc.rows[0]) return res.status(404).json({ error: 'Not found' });\n  res.json(doc.rows[0]);\n}\n\nmodule.exports = { getDocument };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "User cannot access another user's document", "expects": "403" },
      { "id": "t2", "description": "User can access their own document", "expects": "200" }
    ],
    "expected_outcomes": { "fix": "Add WHERE user_id = req.user.id to the query" }
  },
  {
    "id": "f3a4b56c-7d8e-9f0a-1b2c-3d4e5f6a7b8c",
    "title": "N+1 Query Problem",
    "challenge_type": "performance",
    "difficulty": "medium",
    "description": "An API endpoint that lists blog posts with their authors is making N+1 database queries — one for the posts and one per post for the author. This causes severe performance issues at scale. Fix it using a JOIN or eager loading.",
    "starter_code": {
      "routes/posts.js": "const db = require('../db');\n\nasync function getPosts(req, res) {\n  const posts = await db.query('SELECT * FROM posts');\n  for (const post of posts.rows) {\n    const author = await db.query('SELECT * FROM users WHERE id = $1', [post.user_id]);\n    post.author = author.rows[0];\n  }\n  res.json(posts.rows);\n}\n\nmodule.exports = { getPosts };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Returns posts with authors in a single query", "expects": "1_query" },
      { "id": "t2", "description": "All posts have author data populated", "expects": "populated" }
    ],
    "expected_outcomes": { "fix": "Use JOIN: SELECT posts.*, users.name as author_name FROM posts JOIN users ON posts.user_id = users.id" }
  },
  {
    "id": "a4b56c7d-8e9f-0a1b-2c3d-4e5f6a7b8c9d",
    "title": "Optimize Slow Search Endpoint",
    "challenge_type": "performance",
    "difficulty": "hard",
    "description": "A product search endpoint is timing out under load. It fetches all products from the database, filters in JavaScript, then sorts in memory. With 500K products this is catastrophically slow. Optimize it.",
    "starter_code": {
      "routes/search.js": "const db = require('../db');\n\nasync function searchProducts(req, res) {\n  const { query, category, minPrice, maxPrice } = req.query;\n  const all = await db.query('SELECT * FROM products');\n  const filtered = all.rows\n    .filter(p => p.name.includes(query))\n    .filter(p => !category || p.category === category)\n    .filter(p => p.price >= (minPrice || 0) && p.price <= (maxPrice || Infinity))\n    .sort((a, b) => a.price - b.price);\n  res.json(filtered);\n}\n\nmodule.exports = { searchProducts };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Returns correct filtered results", "expects": "correct" },
      { "id": "t2", "description": "Uses database-level filtering", "expects": "db_filtered" }
    ],
    "expected_outcomes": { "fix": "Push filtering and sorting into SQL with WHERE, ILIKE, and ORDER BY. Add indexes on category and price." }
  },
  {
    "id": "b56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d0e",
    "title": "Untangle the God Function",
    "challenge_type": "refactor",
    "difficulty": "medium",
    "description": "A 120-line function handles user registration: validates input, hashes password, creates user, sends welcome email, logs the event, and returns a response — all in one place. Refactor it into clean, single-responsibility modules without changing behaviour.",
    "starter_code": {
      "controllers/register.js": "const bcrypt = require('bcrypt');\nconst db = require('../db');\nconst mailer = require('../mailer');\nconst logger = require('../logger');\n\nasync function register(req, res) {\n  const { email, password, name } = req.body;\n  if (!email || !password || !name) return res.status(400).json({ error: 'Missing fields' });\n  if (password.length < 8) return res.status(400).json({ error: 'Password too short' });\n  const existing = await db.query('SELECT id FROM users WHERE email = $1', [email]);\n  if (existing.rows.length) return res.status(409).json({ error: 'Email taken' });\n  const hash = await bcrypt.hash(password, 12);\n  const user = await db.query('INSERT INTO users (email, password, name) VALUES ($1,$2,$3) RETURNING id', [email, hash, name]);\n  await mailer.send({ to: email, subject: 'Welcome!', body: `Hi ${name}` });\n  logger.info(`New user registered: ${email}`);\n  res.status(201).json({ userId: user.rows[0].id });\n}\n\nmodule.exports = { register };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Registration still works end to end", "expects": "201" },
      { "id": "t2", "description": "Validation rejects missing fields", "expects": "400" },
      { "id": "t3", "description": "Duplicate email returns 409", "expects": "409" }
    ],
    "expected_outcomes": { "approach": "Extract validateInput, hashPassword, createUser, sendWelcomeEmail into separate modules" }
  },
  {
    "id": "c56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d0f",
    "title": "Design a Rate Limiter",
    "challenge_type": "feature",
    "difficulty": "hard",
    "description": "Implement a rate limiting middleware that allows a maximum of 100 requests per IP per minute. Requests exceeding the limit should return HTTP 429. This is a classic system design implementation question asked at Uber, Stripe, and Cloudflare.",
    "starter_code": {
      "middleware/rateLimiter.js": "// Implement a rate limiter\n// Max: 100 requests per IP per 60 seconds\n// Return 429 Too Many Requests when exceeded\n// Hint: consider using a sliding window or token bucket approach\n\nfunction rateLimiter(req, res, next) {\n  // Your implementation here\n}\n\nmodule.exports = rateLimiter;"
    },
    "hidden_tests": [
      { "id": "t1", "description": "101st request from same IP returns 429", "expects": "429" },
      { "id": "t2", "description": "First 100 requests return 200", "expects": "200" },
      { "id": "t3", "description": "Different IPs have separate limits", "expects": "200" }
    ],
    "expected_outcomes": { "approach": "Sliding window counter or token bucket with in-memory Map or Redis" }
  },
  {
    "id": "d56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d1a",
    "title": "Implement a Job Queue",
    "challenge_type": "feature",
    "difficulty": "hard",
    "description": "Build a simple in-memory job queue system that supports: enqueue(job), a worker that processes jobs one at a time, retry logic (max 3 attempts on failure), and a dead letter queue for permanently failed jobs. Asked at Amazon and Microsoft for backend roles.",
    "starter_code": {
      "queue/jobQueue.js": "class JobQueue {\n  constructor() {\n    // Initialize your queue structure\n  }\n\n  enqueue(job) {\n    // Add job to queue\n  }\n\n  async start() {\n    // Start processing jobs\n    // Retry failed jobs up to 3 times\n    // Move permanently failed jobs to dead letter queue\n  }\n\n  getDeadLetterQueue() {\n    // Return failed jobs\n  }\n}\n\nmodule.exports = { JobQueue };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Successful job is processed once", "expects": "processed_1" },
      { "id": "t2", "description": "Failing job is retried 3 times then dead-lettered", "expects": "dead_lettered" },
      { "id": "t3", "description": "Dead letter queue contains failed job", "expects": "in_dlq" }
    ],
    "expected_outcomes": { "approach": "Queue array + retry counter per job + dead letter array" }
  },
  {
    "id": "e56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d1b",
    "title": "Coin Change (Dynamic Programming)",
    "challenge_type": "feature",
    "difficulty": "medium",
    "description": "Given an array of coin denominations and a target amount, return the minimum number of coins needed to make up that amount. If it cannot be made, return -1. Classic DP question asked at Google, Amazon, and Microsoft.",
    "starter_code": {
      "solution.js": "function coinChange(coins, amount) {\n  // Your DP solution here\n}\n\nmodule.exports = { coinChange };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "coinChange([1,2,5], 11) === 3", "expects": "3" },
      { "id": "t2", "description": "coinChange([2], 3) === -1", "expects": "-1" },
      { "id": "t3", "description": "coinChange([1], 0) === 0", "expects": "0" }
    ],
    "expected_outcomes": { "approach": "Bottom-up DP with dp array of size amount+1", "time_complexity": "O(amount \u00d7 coins.length)" }
  },
  {
    "id": "f56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d1c",
    "title": "Longest Common Subsequence",
    "challenge_type": "feature",
    "difficulty": "hard",
    "description": "Given two strings, return the length of their longest common subsequence. A subsequence is a sequence that appears in the same relative order but not necessarily contiguous. Core DP problem asked at Google and Meta.",
    "starter_code": {
      "solution.js": "function longestCommonSubsequence(text1, text2) {\n  // Your 2D DP solution here\n}\n\nmodule.exports = { longestCommonSubsequence };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "LCS('abcde', 'ace') === 3", "expects": "3" },
      { "id": "t2", "description": "LCS('abc', 'abc') === 3", "expects": "3" },
      { "id": "t3", "description": "LCS('abc', 'def') === 0", "expects": "0" }
    ],
    "expected_outcomes": { "approach": "2D DP table", "time_complexity": "O(m\u00d7n)", "space_complexity": "O(m\u00d7n)" }
  },
  {
    "id": "a56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d1d",
    "title": "Course Schedule (Cycle Detection)",
    "challenge_type": "feature",
    "difficulty": "medium",
    "description": "There are numCourses courses labeled 0 to n-1. Given prerequisites pairs [a,b] meaning you must take b before a, determine if it is possible to finish all courses. This is cycle detection in a directed graph — asked at Google and Facebook.",
    "starter_code": {
      "solution.js": "function canFinish(numCourses, prerequisites) {\n  // Your graph cycle detection solution\n}\n\nmodule.exports = { canFinish };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "canFinish(2, [[1,0]]) === true", "expects": "true" },
      { "id": "t2", "description": "canFinish(2, [[1,0],[0,1]]) === false (cycle)", "expects": "false" }
    ],
    "expected_outcomes": { "approach": "Topological sort or DFS cycle detection", "time_complexity": "O(V+E)" }
  },
  {
    "id": "b56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d1e",
    "title": "Word Ladder",
    "challenge_type": "feature",
    "difficulty": "hard",
    "description": "Given two words and a word list, find the length of the shortest transformation sequence from beginWord to endWord, where each step changes exactly one letter and each intermediate word must exist in the word list. BFS hard question — asked at Amazon and Google.",
    "starter_code": {
      "solution.js": "function ladderLength(beginWord, endWord, wordList) {\n  // Your BFS solution here\n}\n\nmodule.exports = { ladderLength };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "ladderLength('hit','cog',['hot','dot','dog','lot','log','cog']) === 5", "expects": "5" },
      { "id": "t2", "description": "Returns 0 when no path exists", "expects": "0" }
    ],
    "expected_outcomes": { "approach": "BFS with visited set", "time_complexity": "O(M^2 \u00d7 N)" }
  },
  {
    "id": "c56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d1f",
    "title": "Search in Rotated Sorted Array",
    "challenge_type": "feature",
    "difficulty": "medium",
    "description": "A sorted array has been rotated at an unknown pivot. Given a target value, return its index or -1 if not found. Must run in O(log n). Asked at almost every MNC — Google, Amazon, Microsoft, Adobe.",
    "starter_code": {
      "solution.js": "function search(nums, target) {\n  // Your O(log n) solution here\n}\n\nmodule.exports = { search };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "search([4,5,6,7,0,1,2], 0) === 4", "expects": "4" },
      { "id": "t2", "description": "search([4,5,6,7,0,1,2], 3) === -1", "expects": "-1" },
      { "id": "t3", "description": "search([1], 0) === -1", "expects": "-1" }
    ],
    "expected_outcomes": { "approach": "Modified binary search", "time_complexity": "O(log n)" }
  },
  {
    "id": "d56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d2a",
    "title": "Find Median from Data Stream",
    "challenge_type": "feature",
    "difficulty": "hard",
    "description": "Design a data structure that supports adding numbers from a data stream and finding the median at any point. This is a classic two-heap problem asked at Google and Apple for senior engineering roles.",
    "starter_code": {
      "solution.js": "class MedianFinder {\n  constructor() {\n    // Initialize your two-heap structure\n    // maxHeap for lower half, minHeap for upper half\n  }\n\n  addNum(num) {\n    // Add number and rebalance heaps\n  }\n\n  findMedian() {\n    // Return current median\n  }\n}\n\nmodule.exports = { MedianFinder };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "addNum(1), addNum(2), findMedian() === 1.5", "expects": "1.5" },
      { "id": "t2", "description": "addNum(3), findMedian() === 2", "expects": "2" }
    ],
    "expected_outcomes": { "approach": "Max-heap + min-heap, rebalance on each insert", "time_complexity": "O(log n) insert, O(1) median" }
  },
  {
    "id": "e56c7d8e-9f0a-1b2c-3d4e-5f6a7b8c9d2b",
    "title": "Design LRU Cache",
    "challenge_type": "feature",
    "difficulty": "hard",
    "description": "Design a data structure that follows the constraints of a Least Recently Used (LRU) cache. Implement LRUCache class with get(key) and put(key, value) in O(1) time complexity.",
    "starter_code": {
      "solution.js": "class LRUCache {\n  constructor(capacity) {\n    // Your solution here\n  }\n\n  get(key) {\n    // Your solution here\n  }\n\n  put(key, value) {\n    // Your solution here\n  }\n}\n\nmodule.exports = { LRUCache };"
    },
    "hidden_tests": [
      { "id": "t1", "description": "Cache get/put operations with capacity 2", "expects": "correct" }
    ],
    "expected_outcomes": { "approach": "HashMap + Doubly Linked List", "time_complexity": "O(1)", "space_capacity": "O(capacity)" }
  }
];

async function seed() {
  console.log('Seeding local mock database...');
  try {
    let mockData = { challenges: [], interview_sessions: [], interview_reports: [] };
    if (fs.existsSync(mockDbPath)) {
      mockData = JSON.parse(fs.readFileSync(mockDbPath, 'utf8'));
    }
    
    // Merge into local mock DB, replacing by ID
    challenges.forEach(challenge => {
      const idx = mockData.challenges.findIndex(c => c.title === challenge.title);
      if (idx !== -1) {
        mockData.challenges[idx] = challenge;
      } else {
        mockData.challenges.push(challenge);
      }
    });
    
    fs.writeFileSync(mockDbPath, JSON.stringify(mockData, null, 2), 'utf8');
    console.log('Local mock DB seeded successfully with', mockData.challenges.length, 'challenges.');
  } catch (err) {
    console.error('Error seeding mock DB:', err);
  }

  // Seed Supabase if env config exists and is not demo
  if (env.NEXT_PUBLIC_SUPABASE_URL) {
    console.log('Seeding Supabase Database...');
    const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    for (const challenge of challenges) {
      try {
        console.log(`Upserting challenge: "${challenge.title}"`);
        const { error } = await supabase
          .from('challenges')
          .upsert({
            id: challenge.id,
            title: challenge.title,
            description: challenge.description,
            challenge_type: challenge.challenge_type,
            difficulty: challenge.difficulty,
            starter_code: challenge.starter_code,
            hidden_tests: challenge.hidden_tests,
            expected_outcomes: challenge.expected_outcomes
          }, { onConflict: 'id' });
          
        if (error) {
          console.error(`Error upserting "${challenge.title}":`, error);
        }
      } catch (err) {
        console.error(`Unexpected exception upserting "${challenge.title}":`, err);
      }
    }
    console.log('Supabase seeding finished.');
  }
}

seed();
