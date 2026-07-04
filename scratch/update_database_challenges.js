const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
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

const structuredTests = {
  "Fix the Broken Authentication": [
    { "id": "t1", "description": "Returns 401 when no token provided", "input_args": { "headers": {} }, "expected_output": { "status": 401, "next": false } },
    { "id": "t2", "description": "Returns 401 when token is malformed", "input_args": { "headers": { "authorization": "Bearer malformed" } }, "expected_output": { "status": 401, "next": false } },
    { "id": "t3", "description": "Returns 401 when token is expired", "input_args": { "headers": { "authorization": "Bearer expired_token" } }, "expected_output": { "status": 401, "next": false } },
    { "id": "t4", "description": "Returns 200 and user data when token is valid", "input_args": { "headers": { "authorization": "Bearer valid_token" } }, "expected_output": { "next": true } },
    { "id": "t5", "description": "Does not crash on missing Authorization header", "input_args": { "headers": {} }, "expected_output": { "next": false } }
  ],
  "Two Sum": [
    { "id": "t1", "description": "twoSum([2,7,11,15], 9)", "input_args": [[2,7,11,15], 9], "expected_output": [0,1] },
    { "id": "t2", "description": "twoSum([3,2,4], 6)", "input_args": [[3,2,4], 6], "expected_output": [1,2] },
    { "id": "t3", "description": "twoSum([3,3], 6)", "input_args": [[3,3], 6], "expected_output": [0,1] }
  ],
  "Valid Parentheses": [
    { "id": "t1", "description": "isValid('()')", "input_args": ["()"], "expected_output": true },
    { "id": "t2", "description": "isValid('()[}')", "input_args": ["()[}"], "expected_output": false },
    { "id": "t3", "description": "isValid('{[]}')", "input_args": ["{[]}"], "expected_output": true }
  ],
  "Longest Substring Without Repeating Characters": [
    { "id": "t1", "description": "lengthOfLongestSubstring('abcabcbb')", "input_args": ["abcabcbb"], "expected_output": 3 },
    { "id": "t2", "description": "lengthOfLongestSubstring('bbbbb')", "input_args": ["bbbbb"], "expected_output": 1 },
    { "id": "t3", "description": "lengthOfLongestSubstring('pwwkew')", "input_args": ["pwwkew"], "expected_output": 3 }
  ],
  "Maximum Subarray (Kadane's Algorithm)": [
    { "id": "t1", "description": "maxSubArray([-2,1,-3,4,-1,2,1,-5,4])", "input_args": [[-2,1,-3,4,-1,2,1,-5,4]], "expected_output": 6 },
    { "id": "t2", "description": "maxSubArray([1])", "input_args": [[1]], "expected_output": 1 },
    { "id": "t3", "description": "maxSubArray([-1,-2,-3])", "input_args": [[-1,-2,-3]], "expected_output": -1 }
  ],
  "Binary Search Tree — Validate": [
    { "id": "t1", "description": "Valid BST [2,1,3]", "input_args": [[2,1,3]], "expected_output": true },
    { "id": "t2", "description": "Invalid BST [5,1,4,null,null,3,6]", "input_args": [[5,1,4,null,null,3,6]], "expected_output": false }
  ],
  "Number of Islands": [
    { "id": "t1", "description": "Single island grid", "input_args": [[["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]], "expected_output": 1 },
    { "id": "t2", "description": "Three separate islands", "input_args": [[["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]], "expected_output": 3 },
    { "id": "t3", "description": "All water", "input_args": [[["0","0","0","0","0"],["0","0","0","0","0"]]], "expected_output": 0 }
  ],
  "Merge K Sorted Lists": [
    { "id": "t1", "description": "Merges [[1,4,5],[1,3,4],[2,6]]", "input_args": [[[1,4,5],[1,3,4],[2,6]]], "expected_output": [1,1,2,3,4,4,5,6] },
    { "id": "t2", "description": "Empty input", "input_args": [[]], "expected_output": [] }
  ],
  "Word Break II": [
    { "id": "t1", "description": "wordBreak('catsanddog')", "input_args": ["catsanddog", ["cat","cats","and","sand","dog"]], "expected_output": ["cat sand dog", "cats and dog"] },
    { "id": "t2", "description": "No valid break", "input_args": ["catsandog", ["cats","dog","sand"]], "expected_output": [] }
  ],
  "Trapping Rain Water": [
    { "id": "t1", "description": "trap([0,1,0,2,1,0,1,3,2,1,2,1])", "input_args": [[0,1,0,2,1,0,1,3,2,1,2,1]], "expected_output": 6 },
    { "id": "t2", "description": "trap([4,2,0,3,2,5])", "input_args": [[4,2,0,3,2,5]], "expected_output": 9 }
  ],
  "Race Condition in Order Processing": [
    { "id": "t1", "description": "Concurrent calls only charge once", "input_args": { "calls": 2, "orderId": "ord_1" }, "expected_output": { "charges": 1 } },
    { "id": "t2", "description": "Different orderIds process both", "input_args": { "calls": 2, "different": true }, "expected_output": { "charges": 2 } }
  ],
  "SQL Injection Vulnerability": [
    { "id": "t1", "description": "Injection payload returns no extra rows", "input_args": { "query": { "username": "' OR '1'='1" } }, "expected_output": { "safe": true } },
    { "id": "t2", "description": "Valid username returns correct user", "input_args": { "query": { "username": "admin" } }, "expected_output": { "found": true } }
  ],
  "Broken Access Control — IDOR": [
    { "id": "t1", "description": "User cannot access another user's document", "input_args": { "params": { "id": "doc_other" }, "user_id": "user_1" }, "expected_output": { "status": 403 } },
    { "id": "t2", "description": "User can access their own document", "input_args": { "params": { "id": "doc_own" }, "user_id": "user_own" }, "expected_output": { "status": 200 } }
  ],
  "N+1 Query Problem": [
    { "id": "t1", "description": "Returns posts with authors in a single query", "input_args": {}, "expected_output": { "queries": 1 } },
    { "id": "t2", "description": "All posts have author data populated", "input_args": {}, "expected_output": { "populated": true } }
  ],
  "Optimize Slow Search Endpoint": [
    { "id": "t1", "description": "Returns correct filtered results", "input_args": { "query": { "query": "phone", "category": "electronics" } }, "expected_output": { "correct": true } },
    { "id": "t2", "description": "Uses database-level filtering", "input_args": { "query": { "query": "phone" } }, "expected_output": { "db_filtered": true } }
  ],
  "Untangle the God Function": [
    { "id": "t1", "description": "Registration works end to end", "input_args": { "body": { "email": "new@user.com", "password": "password123", "name": "New User" } }, "expected_output": { "status": 201 } },
    { "id": "t2", "description": "Validation rejects missing fields", "input_args": { "body": { "email": "new@user.com" } }, "expected_output": { "status": 400 } },
    { "id": "t3", "description": "Duplicate email returns 409", "input_args": { "body": { "email": "duplicate@user.com", "password": "password123", "name": "Dupe" } }, "expected_output": { "status": 409 } }
  ],
  "Design a Rate Limiter": [
    { "id": "t1", "description": "101st request returns 429", "input_args": { "ip": "1.1.1.1", "requests": 101 }, "expected_output": { "status": 429 } },
    { "id": "t2", "description": "First 100 requests return 200", "input_args": { "ip": "1.1.1.1", "requests": 100 }, "expected_output": { "status": 200 } },
    { "id": "t3", "description": "Different IPs separate limits", "input_args": { "ips": ["1.1.1.1", "2.2.2.2"] }, "expected_output": { "status": 200 } }
  ],
  "Implement a Job Queue": [
    { "id": "t1", "description": "Successful job is processed once", "input_args": { "jobs": [{ "fail": false }] }, "expected_output": { "processed": 1 } },
    { "id": "t2", "description": "Failing job is retried 3 times then dead-lettered", "input_args": { "jobs": [{ "fail": true }] }, "expected_output": { "retries": 3, "dlq": 1 } }
  ],
  "Coin Change (Dynamic Programming)": [
    { "id": "t1", "description": "coinChange([1,2,5], 11)", "input_args": [[1,2,5], 11], "expected_output": 3 },
    { "id": "t2", "description": "coinChange([2], 3)", "input_args": [[2], 3], "expected_output": -1 },
    { "id": "t3", "description": "coinChange([1], 0)", "input_args": [[1], 0], "expected_output": 0 }
  ],
  "Longest Common Subsequence": [
    { "id": "t1", "description": "LCS('abcde', 'ace')", "input_args": ["abcde", "ace"], "expected_output": 3 },
    { "id": "t2", "description": "LCS('abc', 'abc')", "input_args": ["abc", "abc"], "expected_output": 3 },
    { "id": "t3", "description": "LCS('abc', 'def')", "input_args": ["abc", "def"], "expected_output": 0 }
  ],
  "Course Schedule (Cycle Detection)": [
    { "id": "t1", "description": "canFinish(2, [[1,0]])", "input_args": [2, [[1,0]]], "expected_output": true },
    { "id": "t2", "description": "canFinish(2, [[1,0],[0,1]])", "input_args": [2, [[1,0],[0,1]]], "expected_output": false }
  ],
  "Word Ladder": [
    { "id": "t1", "description": "ladderLength('hit','cog')", "input_args": ["hit", "cog", ["hot","dot","dog","lot","log","cog"]], "expected_output": 5 },
    { "id": "t2", "description": "No path exists", "input_args": ["hit", "cog", ["hot","dot","dog","lot","log"]], "expected_output": 0 }
  ],
  "Search in Rotated Sorted Array": [
    { "id": "t1", "description": "search([4,5,6,7,0,1,2], 0)", "input_args": [[4,5,6,7,0,1,2], 0], "expected_output": 4 },
    { "id": "t2", "description": "search([4,5,6,7,0,1,2], 3)", "input_args": [[4,5,6,7,0,1,2], 3], "expected_output": -1 }
  ],
  "Find Median from Data Stream": [
    { "id": "t1", "description": "addNum(1), addNum(2), findMedian()", "input_args": { "actions": [["add", 1], ["add", 2], ["median"]] }, "expected_output": [1.5] },
    { "id": "t2", "description": "addNum(3), findMedian()", "input_args": { "actions": [["add", 3], ["median"]] }, "expected_output": [3] }
  ],
  "Design LRU Cache": [
    { "id": "t1", "description": "Cache operations capacity 2", "input_args": { "capacity": 2, "actions": [["put", 1, 1], ["put", 2, 2], ["get", 1], ["put", 3, 3], ["get", 2]] }, "expected_output": [1, -1] }
  ]
};

async function run() {
  console.log("Fetching all challenges from Supabase...");
  const { data: challenges, error } = await supabase.from('challenges').select('*');
  if (error) {
    console.error("Error fetching challenges:", error);
    return;
  }

  console.log(`Fetched ${challenges.length} challenges. Updating test cases...`);

  for (const c of challenges) {
    const updatedTests = structuredTests[c.title];
    if (updatedTests) {
      console.log(`Updating "${c.title}" with structured tests and language...`);
      const { error: updateErr } = await supabase
        .from('challenges')
        .update({
          hidden_tests: updatedTests,
          language: 'javascript'
        })
        .eq('id', c.id);

      if (updateErr) {
        console.error(`Error updating "${c.title}":`, updateErr);
      } else {
        console.log(`Successfully updated "${c.title}"!`);
      }
    } else {
      console.warn(`No structured tests found for "${c.title}"`);
    }
  }

  // Also update local mock json file
  const localMockPath = path.join(__dirname, '..', 'data', 'interview_mock_db.json');
  if (fs.existsSync(localMockPath)) {
    console.log("Updating local mock json database...");
    try {
      const mockDb = JSON.parse(fs.readFileSync(localMockPath, 'utf8'));
      if (mockDb.challenges) {
        mockDb.challenges = mockDb.challenges.map(c => {
          const tests = structuredTests[c.title];
          if (tests) {
            return { ...c, hidden_tests: tests, language: 'javascript' };
          }
          return { ...c, language: 'javascript' };
        });
        fs.writeFileSync(localMockPath, JSON.stringify(mockDb, null, 2), 'utf8');
        console.log("Successfully updated local mock json file!");
      }
    } catch (e) {
      console.error("Error updating local mock json database:", e);
    }
  }
}

run();
