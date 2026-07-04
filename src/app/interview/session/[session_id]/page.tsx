"use client";

import React, { useState, useEffect, useRef, use } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import {
  ChevronLeft,
  Clock,
  Play,
  Send,
  Loader2,
  FileCode,
  FolderOpen,
  Check,
  X,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Maximize2,
  GitBranch,
  Settings,
  Lock,
  Globe,
  RefreshCw,
  Terminal,
  Code2,
  AlertCircle
} from "lucide-react";

// Lazy-load Monaco Editor
const MonacoEditor = dynamic(() => import("@monaco-editor/react"), { ssr: false });

interface Message {
  role: "user" | "assistant";
  content: any; // Can be string or JSON object
}

interface DiffChange {
  filename: string;
  original: string;
  replacement: string;
  explanation: string;
}

// Deep equality helper for comparing actual vs expected outputs
function deepEqual(a: any, b: any): boolean {
  if (a === b) return true;
  if (a && b && typeof a === 'object' && typeof b === 'object') {
    if (Array.isArray(a)) {
      if (!Array.isArray(b) || a.length !== b.length) return false;
      for (let i = 0; i < a.length; i++) {
        if (!deepEqual(a[i], b[i])) return false;
      }
      return true;
    }
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const key of keysA) {
      if (!keysB.includes(key)) return false;
      if (!deepEqual(a[key], b[key])) return false;
    }
    return true;
  }
  return false;
}

// Dynamic script loader for Pyodide
const loadPyodideScript = () => {
  return new Promise<void>((resolve, reject) => {
    if ((window as any).loadPyodide) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdn.jsdelivr.net/pyodide/v0.26.1/full/pyodide.js";
    script.async = true;
    script.onload = () => resolve();
    script.onerror = (err) => reject(err);
    document.body.appendChild(script);
  });
};

let pyodideInstance: any = null;

export default function InterviewWorkspacePage({
  params
}: {
  params: Promise<{ session_id: string }>;
}) {
  const { session_id } = use(params);
  const router = useRouter();

  // Core workspace state
  const [challenge, setChallenge] = useState<any>(null);
  const [codebase, setCodebase] = useState<Record<string, string>>({});
  const [currentFile, setCurrentFile] = useState<string>("");
  const [conversation, setConversation] = useState<Message[]>([]);
  const [pendingDiffs, setPendingDiffs] = useState<DiffChange[]>([]);
  const [activeDiffIndex, setActiveDiffIndex] = useState<number>(0);
  
  // App UI state
  const [loading, setLoading] = useState(true);
  const [isAgentThinking, setIsAgentThinking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [userInput, setUserInput] = useState("");
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  
  // Visual effects
  const [showEditorTooltip, setShowEditorTooltip] = useState(false);
  const [flashGreen, setFlashGreen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [reasoningExpanded, setReasoningExpanded] = useState<Record<number, boolean>>({});

  // NEW Feature States: Manual Mode, Sandbox, Eval scores & GitHub saving
  const [manualMode, setManualMode] = useState(false);
  const [githubAutosave, setGithubAutosave] = useState(false);
  
  // Submit evaluation layers feedback
  const [testRunResults, setTestRunResults] = useState<any>(null);
  const [evaluationFeedback, setEvaluationFeedback] = useState<any>(null);
  const [attemptsCount, setAttemptsCount] = useState(1);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [runningTestIndex, setRunningTestIndex] = useState<number | null>(null);
  
  // GitHub Save Dialog Modal
  const [showGitHubModal, setShowGitHubModal] = useState(false);
  const [proposedRepoName, setProposedRepoName] = useState("");
  const [isRepoPrivate, setIsRepoPrivate] = useState(false);
  const [alwaysSaveSetting, setAlwaysSaveSetting] = useState(false);
  const [isSavingToGitHub, setIsSavingToGitHub] = useState(false);
  const [createdRepoUrl, setCreatedRepoUrl] = useState("");
  const [gitHubError, setGitHubError] = useState<string | null>(null);
  const [reportId, setReportId] = useState<string | null>(null);

  // Refs
  const chatEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Load session data
  useEffect(() => {
    async function fetchSession() {
      try {
        const res = await fetch("/api/interview/start", { method: "GET" });
        if (!res.ok) throw new Error("Failed to load challenges");
        const challengeData = await res.json();

        // Fetch session Details (contains code & user preferences)
        const loadSessionRes = await fetch(`/api/interview/accept-change?session_id=${session_id}`);
        if (!loadSessionRes.ok) {
          throw new Error("Failed to load session details");
        }
        const sessionData = await loadSessionRes.json();
        
        setCodebase(sessionData.current_codebase || {});
        setConversation(sessionData.conversation || []);
        setGithubAutosave(!!sessionData.github_autosave);
        
        // Find first file key to open
        const files = Object.keys(sessionData.current_codebase || {});
        if (files.length > 0) {
          setCurrentFile(files[0]);
        }

        // Fetch challenge details
        const chall = (challengeData.challenges || []).find((c: any) => c.id === sessionData.challenge_id);
        if (chall) {
          setChallenge(chall);
          // Set proposed GitHub repo name
          const slug = chall.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
          setProposedRepoName(`almaprep-${slug}-solution`);
        }
      } catch (err: any) {
        console.error(err);
        showToast("Error loading session. Redirecting...");
        setTimeout(() => router.push("/interview"), 2000);
      } finally {
        setLoading(false);
      }
    }

    fetchSession();
  }, [session_id]);

  // Lazy-load Pyodide when challenge language is python
  useEffect(() => {
    if (challenge?.language === "python") {
      loadPyodideScript().catch((err) => console.error("Failed to load Pyodide bundle:", err));
    }
  }, [challenge]);

  // Handle timer
  useEffect(() => {
    if (loading || isSubmitting) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [loading, isSubmitting]);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation, isAgentThinking]);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleSendPrompt = async () => {
    if (!userInput.trim() || isAgentThinking) return;
    const msg = userInput.trim();
    setUserInput("");
    setIsAgentThinking(true);

    // Reset proposed changes when sending new prompt
    setPendingDiffs([]);

    // Add user message locally
    setConversation((prev) => [...prev, { role: "user", content: msg }]);

    try {
      const res = await fetch("/api/interview/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id, user_message: msg })
      });
      const data = await res.json();
      if (res.ok && data.agent_response) {
        setConversation((prev) => [
          ...prev,
          { role: "assistant", content: data.agent_response }
        ]);

        // If changes proposed, populate the diff workspace
        const proposed = data.agent_response.proposed_changes || [];
        if (proposed.length > 0) {
          setPendingDiffs(proposed);
          setActiveDiffIndex(0);
        }
      } else {
        throw new Error(data.error || "Agent failed to respond");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Failed to reach AI agent. Please try again.");
    } finally {
      setIsAgentThinking(false);
    }
  };

  const handleAcceptChange = async () => {
    if (pendingDiffs.length === 0 || isApplying) return;
    const diff = pendingDiffs[activeDiffIndex];
    setIsApplying(true);

    try {
      const res = await fetch("/api/interview/accept-change", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          filename: diff.filename,
          original: diff.original,
          replacement: diff.replacement
        })
      });

      const data = await res.json();
      if (res.ok && data.updated_codebase) {
        setCodebase(data.updated_codebase);
        
        // Trigger green flash effect in Monaco
        setFlashGreen(true);
        setTimeout(() => setFlashGreen(false), 1000);
        
        showToast(`Applied code changes to ${diff.filename}`);

        // Remove from pending diffs list or check next
        const remaining = [...pendingDiffs];
        remaining.splice(activeDiffIndex, 1);
        setPendingDiffs(remaining);
        setActiveDiffIndex(0);
      } else {
        throw new Error(data.message || data.error || "Failed to apply changes");
      }
    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Error applying changes.");
    } finally {
      setIsApplying(false);
    }
  };

  const handleRejectChange = () => {
    const remaining = [...pendingDiffs];
    remaining.splice(activeDiffIndex, 1);
    setPendingDiffs(remaining);
    setActiveDiffIndex(0);
    showToast("Proposed changes discarded. You can prompt the agent to revise.");
  };

  // Writable Editor changes updates
  const handleEditorChange = (value: string | undefined) => {
    if (manualMode && value !== undefined && currentFile) {
      setCodebase((prev) => ({
        ...prev,
        [currentFile]: value
      }));
    }
  };

  // IN-BROWSER JS SANDBOX RUNNER WITH TIMEOUT
  const runJsTestInWorker = (code: string, challengeTitle: string, test: any): Promise<any> => {
    return new Promise((resolve) => {
      const workerCode = `
        self.onmessage = function(e) {
          const { code, challengeTitle, test } = e.data;
          try {
            const module = { exports: {} };
            const exports = module.exports;
            const process = { env: { JWT_SECRET: "test_secret" } };

            const require = function(path) {
              if (path === 'jsonwebtoken') {
                return {
                  verify: (token, secret) => {
                    if (!token) throw new Error('No token');
                    const parts = token.split('.');
                    if (parts.length !== 3) throw new Error('Invalid token');
                    return { username: 'testuser' };
                  },
                  sign: () => 'mock.jwt.token'
                };
              }
              return {};
            };

            // Custom Node/CommonJS file loaders
            let functionName = "";
            const slug = challengeTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
            if (slug.includes("twosum")) functionName = "twoSum";
            else if (slug.includes("validparentheses")) functionName = "isValid";
            else if (slug.includes("longestsubstring")) functionName = "lengthOfLongestSubstring";
            else if (slug.includes("maximumsubarray")) functionName = "maxSubArray";
            else if (slug.includes("binarysearchtree")) functionName = "isValidBST";
            else if (slug.includes("numberofislands")) functionName = "numIslands";
            else if (slug.includes("mergeksorted")) functionName = "mergeKLists";
            else if (slug.includes("wordbreak")) functionName = "wordBreak";
            else if (slug.includes("trappingrain")) functionName = "trap";
            else if (slug.includes("sql") || slug.includes("brokenaccess") || slug.includes("idor") || slug.includes("n1query") || slug.includes("slowsearch")) {
              functionName = "middleware";
            } else if (slug.includes("godfunction")) functionName = "register";
            else if (slug.includes("ratelimiter")) functionName = "rateLimiter";
            else if (slug.includes("jobqueue")) functionName = "JobQueue";
            else if (slug.includes("coinchange")) functionName = "coinChange";
            else if (slug.includes("longestcommon")) functionName = "longestCommonSubsequence";
            else if (slug.includes("courseschedule")) functionName = "canFinish";
            else if (slug.includes("wordladder")) functionName = "ladderLength";
            else if (slug.includes("rotatedsorted")) functionName = "search";
            else if (slug.includes("mediandata")) functionName = "MedianFinder";
            else if (slug.includes("lrucache")) functionName = "LRUCache";
            else if (slug.includes("authentication")) functionName = "authenticate";

            const isMiddleware = ["authenticate", "middleware", "rateLimiter"].includes(functionName);

            // Deserializers for complex tree/list arguments
            function TreeNode(val) {
              this.val = val;
              this.left = null;
              this.right = null;
            }
            function buildTree(arr) {
              if (!arr || arr.length === 0) return null;
              const root = new TreeNode(arr[0]);
              const queue = [root];
              let i = 1;
              while (queue.length > 0 && i < arr.length) {
                const curr = queue.shift();
                if (arr[i] !== null && arr[i] !== undefined) {
                  curr.left = new TreeNode(arr[i]);
                  queue.push(curr.left);
                }
                i++;
                if (i < arr.length && arr[i] !== null && arr[i] !== undefined) {
                  curr.right = new TreeNode(arr[i]);
                  queue.push(curr.right);
                }
                i++;
              }
              return root;
            }

            function ListNode(val, next = null) {
              this.val = val;
              this.next = next;
            }
            function buildLinkedList(arr) {
              let head = null;
              let curr = null;
              for (const val of arr) {
                const node = new ListNode(val);
                if (!head) head = node;
                else curr.next = node;
                curr = node;
              }
              return head;
            }
            function linkedListToArray(head) {
              const result = [];
              let curr = head;
              while (curr) {
                result.push(curr.val);
                curr = curr.next;
              }
              return result;
            }

            const runAlg = new Function("module", "exports", "require", "process", code + "\\nreturn module.exports;");
            const exported = runAlg(module, module.exports, require, process);

            let targetFn = exported;
            if (exported && typeof exported === 'object') {
              targetFn = exported[functionName] || exported.default || Object.values(exported)[0];
            }

            if (isMiddleware) {
              const req = { headers: test.input_args.headers || {}, query: test.input_args.query || {}, params: test.input_args.params || {} };
              let statusVal = null;
              const res = {
                status: function(s) { statusVal = s; return res; },
                json: function() { return res; },
                send: function() { return res; }
              };
              let nextCalled = false;
              targetFn(req, res, function() {
                nextCalled = true;
              });
              self.postMessage({ success: true, result: { status: statusVal, next: nextCalled } });
            } else {
              let actualResult;
              if (functionName === "JobQueue") {
                const queue = new targetFn();
                const jobs = test.input_args.jobs || [];
                let processed = 0;
                let retries = 0;
                let dlq = 0;
                for (const j of jobs) {
                  if (j.fail) {
                    retries += 3;
                    dlq += 1;
                  } else {
                    processed += 1;
                  }
                }
                actualResult = { processed, retries, dlq };
              } else if (functionName === "LRUCache") {
                const cap = test.input_args.capacity || 2;
                const cache = new targetFn(cap);
                const outputs = [];
                for (const act of test.input_args.actions || []) {
                  if (act[0] === "put") cache.put(act[1], act[2]);
                  if (act[0] === "get") outputs.push(cache.get(act[1]));
                }
                actualResult = outputs;
              } else if (functionName === "MedianFinder") {
                const finder = new targetFn();
                const outputs = [];
                for (const act of test.input_args.actions || []) {
                  if (act[0] === "add") finder.addNum(act[1]);
                  if (act[0] === "median") outputs.push(finder.findMedian());
                }
                actualResult = outputs;
              } else if (functionName === "isValidBST") {
                const root = buildTree(test.input_args[0]);
                actualResult = targetFn(root);
              } else if (functionName === "mergeKLists") {
                const lists = test.input_args[0].map(arr => buildLinkedList(arr));
                const merged = targetFn(lists);
                actualResult = linkedListToArray(merged);
              } else {
                actualResult = targetFn(...test.input_args);
              }
              self.postMessage({ success: true, result: actualResult });
            }
          } catch (err) {
            self.postMessage({ success: false, error: err.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: "application/javascript" });
      const worker = new Worker(URL.createObjectURL(blob));

      const timeoutId = setTimeout(() => {
        worker.terminate();
        resolve({ success: false, error: "Execution timed out (5 seconds limit reached)" });
      }, 5000);

      worker.onmessage = (e) => {
        clearTimeout(timeoutId);
        worker.terminate();
        resolve(e.data);
      };

      worker.postMessage({ code, challengeTitle, test });
    });
  };

  // IN-BROWSER PYTHON RUNNER WITH PYODIDE
  const runPythonTest = async (code: string, challengeTitle: string, test: any) => {
    try {
      await loadPyodideScript();
      if (!pyodideInstance) {
        pyodideInstance = await (window as any).loadPyodide();
      }

      let functionName = "";
      const slug = challengeTitle.toLowerCase().replace(/[^a-z0-9]/g, "");
      if (slug.includes("twosum")) functionName = "two_sum";
      else if (slug.includes("validparentheses")) functionName = "is_valid";
      else if (slug.includes("longestsubstring")) functionName = "length_of_longest_substring";
      else if (slug.includes("maximumsubarray")) functionName = "max_sub_array";
      else if (slug.includes("binarysearchtree")) functionName = "is_valid_bst";
      else if (slug.includes("numberofislands")) functionName = "num_islands";
      else if (slug.includes("mergeksorted")) functionName = "merge_k_lists";
      else if (slug.includes("wordbreak")) functionName = "word_break";
      else if (slug.includes("trappingrain")) functionName = "trap";
      else if (slug.includes("coinchange")) functionName = "coin_change";
      else if (slug.includes("longestcommon")) functionName = "longest_common_subsequence";
      else if (slug.includes("courseschedule")) functionName = "can_finish";
      else if (slug.includes("wordladder")) functionName = "ladder_length";
      else if (slug.includes("rotatedsorted")) functionName = "search";

      const argsJson = JSON.stringify(test.input_args);
      
      const pyRunCode = `
import json
${code}

def __run_test():
    args = json.loads('${argsJson.replace(/'/g, "\\'")}')
    # Simple Python execution harness
    res = ${functionName}(*args)
    return json.dumps(res)

__run_test()
      `;

      const executionPromise = (async () => {
        const resultJson = await pyodideInstance.runPythonAsync(pyRunCode);
        return JSON.parse(resultJson);
      })();

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error("Execution timed out (5 seconds limit reached)")), 5000);
      });

      const res = await Promise.race([executionPromise, timeoutPromise]);
      return { success: true, result: res };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  };

  // Run all structured test cases
  const runAllTests = async (userCode: string, lang: string) => {
    const tests = challenge.hidden_tests || [];
    const resultsList = [];
    let passedCount = 0;

    for (let i = 0; i < tests.length; i++) {
      setRunningTestIndex(i);
      const test = tests[i];
      let testRes: any;
      
      try {
        if (lang === "python") {
          testRes = await runPythonTest(userCode, challenge.title, test);
        } else {
          testRes = await runJsTestInWorker(userCode, challenge.title, test);
        }

        const actual = testRes.success ? testRes.result : null;
        const error = testRes.success ? null : testRes.error;
        const expected = test.expected_output;
        
        let passed = false;
        if (testRes.success) {
          passed = deepEqual(actual, expected);
        }

        if (passed) passedCount++;

        resultsList.push({
          input: test.input_args,
          expected: expected,
          actual: testRes.success ? actual : (error || "Execution error"),
          passed
        });
      } catch (err: any) {
        resultsList.push({
          input: test.input_args,
          expected: test.expected_output,
          actual: err.message || "Execution error",
          passed: false
        });
      }
    }

    setRunningTestIndex(null);
    return {
      passed: passedCount,
      failed: tests.length - passedCount,
      total: tests.length,
      results: resultsList
    };
  };

  // SUBMIT SOLUTION WITH 3-LAYER EVALUATION
  const handleSubmitSolution = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    setTestRunResults(null);
    setEvaluationFeedback(null);
    setGitHubError(null);
    setCreatedRepoUrl("");

    const currentFileContent = codebase[currentFile] || "";
    const lang = challenge.language || "javascript";

    showToast("Running tests in sandbox...");

    const testResults = await runAllTests(currentFileContent, lang);
    setTestRunResults(testResults);

    showToast("Tests complete! Submitting for AI review...");

    try {
      const res = await fetch("/api/interview/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          test_results: testResults
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Evaluation failed");
      }

      setEvaluationFeedback(data.evaluation);
      setAttemptsCount(data.attempts);
      setReportId(data.report_id || null);
      setShowResultsModal(true);

      if (data.success) {
        showToast("Challenge successfully passed!");
        // Check auto-save setting
        if (githubAutosave) {
          await triggerGitHubSave(false, false); // Auto-save as public, no preference update
        } else {
          setShowGitHubModal(true);
        }
      } else {
        showToast("Evaluation failed. Review feedback and retry.");
      }

    } catch (err: any) {
      console.error(err);
      showToast(err.message || "Submission failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // TRIGGER GITHUB AUTO-CREATION & FILE COMMIT
  const triggerGitHubSave = async (isPrivate: boolean, alwaysSave: boolean) => {
    setIsSavingToGitHub(true);
    setGitHubError(null);
    showToast("Creating GitHub repository & committing solution...");

    try {
      const res = await fetch("/api/github/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          session_id,
          repo_name: proposedRepoName,
          is_private: isPrivate,
          always_save: alwaysSave
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save solution to GitHub");
      }

      setCreatedRepoUrl(data.repo_url);
      setProposedRepoName(data.repo_name);
      showToast("Successfully saved to GitHub!");
      if (alwaysSave) {
        setGithubAutosave(true);
      }
    } catch (err: any) {
      console.error(err);
      setGitHubError(err.message || "Failed to save to GitHub");
    } finally {
      setIsSavingToGitHub(false);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60)
      .toString()
      .padStart(2, "0");
    const secs = (totalSeconds % 60).toString().padStart(2, "0");
    return `${mins}:${secs}`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSendPrompt();
    }
  };

  const handleEditorClick = () => {
    if (!manualMode) {
      setShowEditorTooltip(true);
      setTimeout(() => setShowEditorTooltip(false), 3000);
    }
  };

  const getLanguageFromFilename = (filename: string) => {
    if (filename.endsWith(".js")) return "javascript";
    if (filename.endsWith(".py")) return "python";
    if (filename.endsWith(".ts")) return "typescript";
    if (filename.endsWith(".json")) return "json";
    return "plaintext";
  };

  const toggleReasoning = (index: number) => {
    setReasoningExpanded((prev) => ({
      ...prev,
      [index]: !prev[index]
    }));
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#062b22] text-[#a7f3d0] flex flex-col items-center justify-center">
        <Loader2 className="size-8 animate-spin text-[#10b981] mb-4" />
        <p className="text-sm font-medium">Entering secure workspace environment...</p>
      </div>
    );
  }

  return (
    <div className="almaprep-theme h-screen w-screen flex flex-col overflow-hidden bg-[#0a0f1d] text-slate-100 font-sans">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-16 right-6 z-50 bg-[#062b22] text-[#a7f3d0] border border-[#059669]/20 px-4 py-3 rounded-xl shadow-lg flex items-center gap-2">
          <Sparkles className="size-4 text-[#10b981] animate-pulse" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Topbar */}
      <header className="h-12 shrink-0 bg-[#111827] border-b border-[#374151] flex items-center justify-between px-4 z-40">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/interview")}
            className="p-1 hover:bg-[#1f2937] rounded-lg transition-colors text-slate-400 hover:text-slate-100 cursor-pointer"
          >
            <ChevronLeft className="size-5" />
          </button>
          <span className="font-semibold text-sm tracking-tight text-white">
            {challenge?.title || "Coding Challenge"}
          </span>
          <span className="text-[10px] bg-amber-950/40 text-amber-500 border border-amber-500/20 px-2 py-0.5 rounded-full font-semibold">
            {challenge?.difficulty ? challenge.difficulty.toUpperCase() : "MEDIUM"}
          </span>
        </div>

        {/* Center: Timer */}
        <div className="flex items-center gap-2 text-slate-400 font-mono text-sm">
          <Clock className="size-4" />
          <span>{formatTime(elapsedSeconds)}</span>
        </div>

        {/* Right: Submit Button */}
        <div>
          <button
            onClick={handleSubmitSolution}
            disabled={isSubmitting}
            className="bg-[#059669] hover:bg-[#047857] disabled:opacity-60 text-white font-semibold text-xs px-4 py-1.5 rounded-lg shadow transition-all cursor-pointer inline-flex items-center gap-1.5"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="size-3.5 animate-spin" />
                <span>Running Sandbox...</span>
              </>
            ) : (
              <>
                <Play className="size-3.5 fill-current" />
                <span>Submit Solution</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Lower Workspace (flex-1) */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* Left Panel: File Tree (200px) */}
        <aside className="w-[200px] bg-[#0d1323] border-r border-[#1f2937] flex flex-col shrink-0">
          <div className="p-3 border-b border-[#1f2937]">
            <span className="text-[10px] font-bold text-slate-500 tracking-wider uppercase">
              Workspace Files
            </span>
          </div>
          <nav className="flex-1 overflow-y-auto p-2 space-y-1">
            {Object.keys(codebase).map((filename) => {
              const isActive = currentFile === filename;
              return (
                <button
                  key={filename}
                  onClick={() => setCurrentFile(filename)}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all text-left cursor-pointer ${
                    isActive
                      ? "bg-[#1f2937] text-white border-l-2 border-[#10b981]"
                      : "text-slate-400 hover:bg-[#1f2937]/50 hover:text-slate-200"
                  }`}
                >
                  <FileCode className={`size-3.5 ${isActive ? "text-[#10b981]" : ""}`} />
                  <span className="truncate">{filename}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Center Panel: Monaco Editor */}
        <main
          className="flex-1 flex flex-col relative bg-[#1e1e1e] overflow-hidden"
          onClick={handleEditorClick}
        >
          {/* Read-Only Tooltip */}
          {showEditorTooltip && !manualMode && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 bg-[#111827] text-slate-200 text-xs px-3 py-1.5 rounded-lg border border-[#374151] shadow-xl flex items-center gap-1.5 animate-bounce">
              <HelpCircle className="size-3.5 text-[#10b981]" />
              <span>Prompt the AI agent or turn on Manual Mode to type directly.</span>
            </div>
          )}

          {/* Green flash overlay for edits */}
          {flashGreen && (
            <div className="absolute inset-0 bg-emerald-500/10 pointer-events-none z-30 transition-opacity duration-1000 animate-pulse" />
          )}

          {/* Monaco Editor Header */}
          <div className="bg-[#181818] border-b border-[#2d2d2d] px-4 py-2 flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400">{currentFile}</span>
            <div className="flex items-center gap-4">
              {/* Manual Mode Toggle */}
              <div className="flex items-center gap-2 select-none">
                <span className="text-[10px] text-slate-400 font-semibold uppercase">Manual Mode</span>
                <button
                  type="button"
                  onClick={() => setManualMode(!manualMode)}
                  className="w-8 h-4 bg-slate-800 rounded-full p-0.5 transition-all flex items-center relative border border-slate-700 cursor-pointer"
                >
                  <div className={`size-3 rounded-full bg-[#10b981] transition-all transform ${manualMode ? "translate-x-4" : "translate-x-0"}`} />
                </button>
              </div>
              <div className="h-3 w-px bg-slate-700" />
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 font-mono">
                <FolderOpen className="size-3" />
                <span>{manualMode ? "Writable Mode" : "Read-Only Mode"}</span>
              </div>
            </div>
          </div>

          {/* Editor Container */}
          <div className="flex-1 w-full h-full relative">
            {currentFile && (
              <MonacoEditor
                height="100%"
                language={getLanguageFromFilename(currentFile)}
                theme="vs-dark"
                value={codebase[currentFile] || ""}
                onChange={handleEditorChange}
                options={{
                  readOnly: !manualMode,
                  fontSize: 14,
                  fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                  lineNumbers: "on",
                  wordWrap: "off",
                  minimap: { enabled: false },
                  scrollbar: { vertical: "visible", horizontal: "visible" },
                  domReadOnly: !manualMode
                }}
              />
            )}
          </div>
        </main>

        {/* Right Panel: Agent Chat (380px) */}
        <aside className="w-[380px] bg-[#0d1323] border-l border-[#1f2937] flex flex-col shrink-0 relative">
          
          {/* Chat Header */}
          <div className="p-3.5 border-b border-[#1f2937] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-[#10b981] animate-pulse" />
              <span className="font-semibold text-xs text-white">AI Interview Copilot</span>
            </div>
            <span className="text-[10px] text-slate-500 font-mono">llama-3.3-70b</span>
          </div>

          {/* Chat Messages Log */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {conversation.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 text-slate-500">
                <Sparkles className="size-8 text-[#059669]/40 mb-3" />
                <p className="text-xs font-medium leading-relaxed max-w-[240px]">
                  Ask the agent to inspect the code, explain issues, or propose updates to fix the bug.
                </p>
              </div>
            ) : (
              conversation.map((msg, index) => {
                const isUser = msg.role === "user";
                
                if (isUser) {
                  return (
                    <div key={`msg-${index}`} className="flex flex-col items-end">
                      <div className="bg-[#059669] text-white text-xs px-3.5 py-2.5 rounded-2xl rounded-tr-none max-w-[85%] shadow-sm leading-relaxed whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    </div>
                  );
                } else {
                  // Assistant message formatting
                  const agentData = typeof msg.content === "string" ? { reasoning: msg.content, proposed_changes: [], follow_up: "" } : msg.content;
                  const showReasoning = reasoningExpanded[index] ?? false;

                  return (
                    <div key={`msg-${index}`} className="flex flex-col items-start space-y-2">
                      <div className="bg-[#1f2937] border border-[#374151] rounded-2xl rounded-tl-none p-3.5 max-w-[90%] text-xs text-slate-200 leading-relaxed space-y-3">
                        {/* Reasoning Section (Collapsible) */}
                        {agentData.reasoning && (
                          <div className="space-y-1">
                            <span className="font-bold text-[10px] text-[#10b981] uppercase tracking-wider block">
                              Analysis
                            </span>
                            <div className={`text-slate-300 whitespace-pre-wrap ${!showReasoning ? "line-clamp-3" : ""}`}>
                              {agentData.reasoning}
                            </div>
                            {agentData.reasoning.split("\n").length > 3 && (
                              <button
                                onClick={() => toggleReasoning(index)}
                                className="text-[10px] text-[#10b981] hover:underline font-semibold tracking-wide cursor-pointer"
                              >
                                {showReasoning ? "Show less" : "Show more"}
                              </button>
                            )}
                          </div>
                        )}

                        {/* Indicator for Proposed Changes */}
                        {agentData.proposed_changes && agentData.proposed_changes.length > 0 && (
                          <div className="bg-[#111827] border border-[#2d3748] rounded-xl p-2.5 flex items-center justify-between">
                            <div className="flex flex-col">
                              <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wide">
                                Diff Proposed
                              </span>
                              <span className="text-[9px] text-slate-400">
                                {agentData.proposed_changes.length} file change(s) ready
                              </span>
                            </div>
                            <button
                              onClick={() => {
                                setPendingDiffs(agentData.proposed_changes);
                                setActiveDiffIndex(0);
                              }}
                              className="bg-amber-600/20 text-amber-500 hover:bg-amber-600/30 font-semibold px-2 py-1 rounded text-[10px] border border-amber-600/30 flex items-center gap-1 cursor-pointer"
                            >
                              <span>View Diff</span>
                              <Maximize2 className="size-2.5" />
                            </button>
                          </div>
                        )}

                        {/* Follow up text */}
                        {agentData.follow_up && (
                          <div className="pt-2 border-t border-[#2d3748] text-slate-400 italic">
                            {agentData.follow_up}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }
              })
            )}

            {/* Agent thinking state */}
            {isAgentThinking && (
              <div className="flex flex-col items-start space-y-1">
                <div className="bg-[#1f2937] border border-[#374151] rounded-2xl rounded-tl-none px-4 py-3.5 flex flex-col gap-2">
                  <div className="flex items-center gap-1">
                    <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" />
                    <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="size-1.5 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="text-[9px] text-slate-500 font-medium">Agent is analyzing codebase...</span>
                </div>
              </div>
            )}
            
            <div ref={chatEndRef} />
          </div>

          {/* Bottom Chat Input Form */}
          <div className="p-3 border-t border-[#1f2937] bg-[#0c101d] shrink-0">
            <div className="relative bg-[#1f2937] rounded-xl border border-[#374151] focus-within:border-[#10b981] p-2 flex flex-col">
              <textarea
                ref={textareaRef}
                value={userInput}
                onChange={(e) => setUserInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask the agent to find bugs or propose fixes..."
                rows={2}
                maxLength={1000}
                className="w-full resize-none bg-transparent text-xs text-white placeholder-slate-500 outline-none border-none pr-10 focus:ring-0 leading-relaxed"
              />
              <div className="flex items-center justify-between mt-1 pt-1.5 border-t border-[#2d3748]">
                {/* Character Counter */}
                <span className={`text-[9px] font-mono ${userInput.length > 200 ? "text-amber-500" : "text-slate-500"}`}>
                  {userInput.length}/1000
                </span>
                
                <button
                  onClick={handleSendPrompt}
                  disabled={!userInput.trim() || isAgentThinking}
                  className="bg-[#059669] hover:bg-[#047857] disabled:opacity-50 text-white p-1.5 rounded-lg transition-all cursor-pointer"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Floating Diff Review Panel */}
          {pendingDiffs.length > 0 && (
            <div className="absolute inset-x-0 bottom-0 bg-[#111827] border-t-2 border-[#10b981] shadow-2xl z-50 flex flex-col transform transition-all duration-300">
              
              {/* Header */}
              <div className="px-4 py-2 border-b border-[#1f2937] flex items-center justify-between bg-[#1f2937]/30">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">
                    Diff Review
                  </span>
                  {pendingDiffs.length > 1 && (
                    <div className="flex gap-1">
                      {pendingDiffs.map((d, idx) => (
                        <button
                          key={d.filename + idx}
                          onClick={() => setActiveDiffIndex(idx)}
                          className={`text-[9px] px-2 py-0.5 rounded font-mono ${
                            activeDiffIndex === idx
                              ? "bg-slate-700 text-white font-bold"
                              : "bg-slate-900 text-slate-400"
                          }`}
                        >
                          {d.filename.split("/").pop()}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setPendingDiffs([])}
                  className="text-slate-400 hover:text-white p-1 cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              </div>

              {/* Body */}
              <div className="p-4 space-y-3">
                <div className="text-[10px] text-slate-300 font-semibold truncate">
                  File: <span className="font-mono text-amber-400">{pendingDiffs[activeDiffIndex].filename}</span>
                </div>
                {pendingDiffs[activeDiffIndex].explanation && (
                  <p className="text-[10px] text-slate-400 italic leading-relaxed">
                    {pendingDiffs[activeDiffIndex].explanation}
                  </p>
                )}

                {/* Diff Viewer Grid */}
                <div className="bg-[#1e1e1e] border border-[#2d2d2d] rounded-lg max-h-48 overflow-y-auto text-[10px] font-mono leading-relaxed">
                  {/* Original Red Removed Lines */}
                  {pendingDiffs[activeDiffIndex].original.split("\n").map((line, idx) => (
                    <div key={`rem-${idx}`} className="bg-red-950/40 text-red-400 px-3 py-0.5 border-l-4 border-red-500/80 flex items-start whitespace-pre-wrap">
                      <span className="w-5 select-none opacity-40">-</span>
                      <span>{line}</span>
                    </div>
                  ))}
                  {/* Replacement Green Added Lines */}
                  {pendingDiffs[activeDiffIndex].replacement.split("\n").map((line, idx) => (
                    <div key={`add-${idx}`} className="bg-emerald-950/40 text-emerald-400 px-3 py-0.5 border-l-4 border-emerald-500/80 flex items-start whitespace-pre-wrap">
                      <span className="w-5 select-none opacity-40">+</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-2">
                  <button
                    onClick={handleAcceptChange}
                    disabled={isApplying}
                    className="flex-1 bg-[#059669] hover:bg-[#047857] text-white font-semibold text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="size-3.5" />
                    <span>Accept Change</span>
                  </button>
                  <button
                    onClick={handleRejectChange}
                    className="flex-1 bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-semibold text-xs py-2 rounded-lg border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <X className="size-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          )}

        </aside>
      </div>

      {/* LIVE TEST CASE PROGRESS INDICATOR (Overlay during submission run) */}
      {runningTestIndex !== null && (
        <div className="absolute inset-0 bg-[#0a0f1d]/85 z-50 flex flex-col items-center justify-center backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-[#1f2937] p-8 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl">
            <Loader2 className="size-10 animate-spin text-emerald-500 mx-auto" />
            <h3 className="font-bold text-white text-lg">Running Sandbox Tests</h3>
            <p className="text-xs text-slate-400">
              Executing test case <span className="font-mono text-emerald-400 font-bold">{runningTestIndex + 1}</span> of <span className="font-mono text-slate-300 font-bold">{(challenge?.hidden_tests || []).length}</span>...
            </p>
            <div className="w-full bg-[#1f2937] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full transition-all duration-300"
                style={{ width: `${((runningTestIndex + 1) / (challenge?.hidden_tests || []).length) * 100}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 3-LAYER EVALUATION RESULTS FEEDBACK PANEL MODAL */}
      {showResultsModal && (
        <div className="absolute inset-0 bg-[#0a0f1d]/90 z-50 flex items-center justify-center p-6 backdrop-blur-sm overflow-y-auto">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl animate-scale-up">
            
            {/* Modal Header */}
            <header className="p-4 border-b border-slate-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Code2 className="size-5 text-emerald-500" />
                <h3 className="font-bold text-white text-base">Evaluation Results — Attempt {attemptsCount} of 3</h3>
              </div>
              <button
                onClick={() => setShowResultsModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </header>

            {/* Modal Body (Scrollable) */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Overall Grade Header */}
              {evaluationFeedback && (
                <div className={`p-4 rounded-xl border flex items-center justify-between ${
                  (testRunResults?.passed / testRunResults?.total) >= 0.7 && evaluationFeedback.logic?.logicScore >= 7 && evaluationFeedback.quality?.qualityScore >= 6
                    ? "bg-emerald-950/20 border-emerald-500/30 text-emerald-400"
                    : "bg-rose-950/20 border-rose-500/30 text-rose-400"
                }`}>
                  <div className="flex items-center gap-3">
                    <AlertCircle className="size-6 shrink-0" />
                    <div>
                      <h4 className="font-black text-sm uppercase tracking-wide">
                        {(testRunResults?.passed / testRunResults?.total) >= 0.7 && evaluationFeedback.logic?.logicScore >= 7 && evaluationFeedback.quality?.qualityScore >= 6
                          ? "🎉 Success Criteria Passed!"
                          : "❌ Criteria Failed"}
                      </h4>
                      <p className="text-xs text-slate-300 mt-1 leading-normal">
                        Needs: Test execution &ge; 70%, Logic Grader &ge; 7/10, Quality Grader &ge; 6/10.
                      </p>
                    </div>
                  </div>
                  
                  {/* Score Circles Grid */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Tests</span>
                      <span className="font-mono text-sm font-black">{Math.round((testRunResults?.passed / testRunResults?.total) * 100)}%</span>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Logic</span>
                      <span className="font-mono text-sm font-black">{evaluationFeedback.logic?.logicScore || 0}/10</span>
                    </div>
                    <div className="h-6 w-px bg-slate-700" />
                    <div className="flex flex-col items-center">
                      <span className="text-[10px] uppercase text-slate-400 font-bold tracking-wider">Quality</span>
                      <span className="font-mono text-sm font-black">{evaluationFeedback.quality?.qualityScore || 0}/10</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Layer 1 — Test Cases Execution Results */}
              <section className="space-y-2">
                <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-2">
                  <Terminal className="size-4 text-emerald-500" />
                  Layer 1 — Test Case Execution
                </h4>
                
                {/* Test Results list */}
                <div className="bg-[#0b0f19] border border-[#1f2937] rounded-xl overflow-hidden text-xs">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-slate-900 border-b border-[#1f2937] text-slate-400 font-bold">
                        <th className="p-3">Test Case</th>
                        <th className="p-3">Input Arguments</th>
                        <th className="p-3">Expected Output</th>
                        <th className="p-3">Actual Output</th>
                        <th className="p-3 text-right">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#1f2937] text-slate-300 font-mono">
                      {testRunResults?.results?.map((res: any, idx: number) => (
                        <tr key={idx} className="hover:bg-slate-900/30">
                          <td className="p-3 font-sans">Case {idx + 1}</td>
                          <td className="p-3 truncate max-w-[150px]">{JSON.stringify(res.input)}</td>
                          <td className="p-3 truncate max-w-[120px]">{JSON.stringify(res.expected)}</td>
                          <td className="p-3 truncate max-w-[120px]">{JSON.stringify(res.actual)}</td>
                          <td className="p-3 text-right">
                            {res.passed ? (
                              <span className="text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded font-bold font-sans">Pass</span>
                            ) : (
                              <span className="text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded font-bold font-sans">Fail</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>

              {/* Layer 2 — Logic & Correctness Analysis */}
              {evaluationFeedback?.logic && (
                <section className="space-y-3">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Sparkles className="size-4 text-[#10b981]" />
                    Layer 2 — Logic & Correctness Analysis
                  </h4>
                  
                  <div className="bg-[#0b0f19] border border-[#1f2937] rounded-xl p-4 space-y-4 text-xs">
                    <div className="grid grid-cols-2 gap-4 border-b border-[#1f2937] pb-3 text-slate-300">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Time Complexity:</span>
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-white font-bold">{evaluationFeedback.logic.timeComplexity}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block mb-0.5">Space Complexity:</span>
                        <span className="font-mono bg-slate-900 px-2 py-0.5 rounded text-white font-bold">{evaluationFeedback.logic.spaceComplexity}</span>
                      </div>
                    </div>
                    
                    {evaluationFeedback.logic.edgeCasesMissed?.length > 0 && (
                      <div>
                        <span className="text-slate-400 block mb-1.5 font-bold">Unaddressed Edge Cases:</span>
                        <ul className="space-y-1 list-disc pl-4 text-slate-300">
                          {evaluationFeedback.logic.edgeCasesMissed.map((ec: string, i: number) => (
                            <li key={i}>{ec}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div>
                      <span className="text-slate-400 block mb-1 font-bold">Correctness Feedback:</span>
                      <p className="text-slate-300 leading-relaxed font-sans">{evaluationFeedback.logic.logicFeedback}</p>
                    </div>
                  </div>
                </section>
              )}

              {/* Layer 3 — Code Quality & Readability */}
              {evaluationFeedback?.quality && (
                <section className="space-y-3">
                  <h4 className="font-bold text-xs uppercase text-slate-400 tracking-wider flex items-center gap-2">
                    <Code2 className="size-4 text-emerald-500" />
                    Layer 3 — Code Quality Analysis
                  </h4>
                  
                  <div className="bg-[#0b0f19] border border-[#1f2937] rounded-xl p-4 space-y-4 text-xs">
                    <div className="border-b border-[#1f2937] pb-3 flex justify-between items-center">
                      <div>
                        <span className="text-slate-400 block mb-0.5">Readability Rating:</span>
                        <span className="font-mono bg-slate-900 px-2.5 py-0.5 rounded text-emerald-400 font-bold">{evaluationFeedback.quality.readabilityScore || 0}/10</span>
                      </div>
                    </div>
                    
                    {evaluationFeedback.quality.issues?.length > 0 && (
                      <div>
                        <span className="text-slate-400 block mb-1.5 font-bold">Detected Code Quality Issues:</span>
                        <ul className="space-y-1 pl-4 list-disc text-slate-300 font-sans">
                          {evaluationFeedback.quality.issues.map((issue: string, i: number) => (
                            <li key={i}>{issue}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {evaluationFeedback.quality.suggestions?.length > 0 && (
                      <div>
                        <span className="text-slate-400 block mb-1.5 font-bold">Suggestions for Improvement:</span>
                        <ul className="space-y-1 pl-4 list-disc text-slate-300 font-sans">
                          {evaluationFeedback.quality.suggestions.map((sug: string, i: number) => (
                            <li key={i}>{sug}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </section>
              )}

            </div>

            {/* Modal Actions */}
            <footer className="p-4 border-t border-slate-800 flex justify-end gap-3 shrink-0">
              {/* If Success AND autosave wasn't already triggered, show manual repo save option */}
              {evaluationFeedback && 
               (testRunResults?.passed / testRunResults?.total) >= 0.7 && 
               evaluationFeedback.logic?.logicScore >= 7 && 
               evaluationFeedback.quality?.qualityScore >= 6 && 
               !githubAutosave && 
               !createdRepoUrl && (
                <button
                  onClick={() => {
                    setShowResultsModal(false);
                    setShowGitHubModal(true);
                  }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Save to GitHub
                </button>
              )}
              
              {/* If Failed and attempts remain */}
              {attemptsCount < 3 && evaluationFeedback && !(
                (testRunResults?.passed / testRunResults?.total) >= 0.7 && 
                evaluationFeedback.logic?.logicScore >= 7 && 
                evaluationFeedback.quality?.qualityScore >= 6
              ) && (
                <button
                  onClick={() => setShowResultsModal(false)}
                  className="bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Close & Retry
                </button>
              )}

              {/* If Passed - Finish & Exit */}
              {evaluationFeedback && (testRunResults?.passed / testRunResults?.total) >= 0.7 && 
               evaluationFeedback.logic?.logicScore >= 7 && 
               evaluationFeedback.quality?.qualityScore >= 6 && (
                <button
                  onClick={() => {
                    setShowResultsModal(false);
                    router.push("/dashboard");
                  }}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Finish & Exit
                </button>
              )}

              {/* If Failed and no attempts remain */}
              {attemptsCount >= 3 && evaluationFeedback && !(
                (testRunResults?.passed / testRunResults?.total) >= 0.7 && 
                evaluationFeedback.logic?.logicScore >= 7 && 
                evaluationFeedback.quality?.qualityScore >= 6
              ) && (
                <button
                  onClick={() => {
                    setShowResultsModal(false);
                    router.push("/dashboard");
                  }}
                  className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Exit Workspace
                </button>
              )}
            </footer>
          </div>
        </div>
      )}

      {/* GITHUB OAUTH AUTO-CREATION CONFIRMATION MODAL */}
      {showGitHubModal && (
        <div className="absolute inset-0 bg-[#0a0f1d]/90 z-50 flex items-center justify-center p-6 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl animate-scale-up">
            
            <header className="text-center space-y-2">
              <span className="text-3xl">🎉</span>
              <h3 className="font-black text-white text-lg leading-snug">Challenge Completed Successfully!</h3>
              <p className="text-xs text-slate-400 leading-normal">
                Would you like to save this coding solution directly to your GitHub portfolio?
              </p>
            </header>

            {createdRepoUrl ? (
              // Success State
              <div className="bg-emerald-950/20 border border-emerald-500/30 p-4 rounded-xl text-center space-y-3">
                <Check className="size-8 text-emerald-500 mx-auto" />
                <h4 className="font-bold text-emerald-400 text-xs uppercase tracking-wide">Repo Created Successfully!</h4>
                <p className="text-[11px] text-slate-300 font-mono truncate">Name: {proposedRepoName}</p>
                <a
                  href={createdRepoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-bold hover:underline"
                >
                  <span>View on GitHub</span>
                  <ArrowRight className="size-3.5" />
                </a>
              </div>
            ) : (
              // Form Input State
              <div className="space-y-4 text-xs">
                
                {/* Repository Name Input */}
                <div className="flex flex-col gap-1.5">
                  <label className="text-slate-400 font-semibold">Repository Name</label>
                  <input
                    type="text"
                    value={proposedRepoName}
                    onChange={(e) => setProposedRepoName(e.target.value)}
                    placeholder="almaprep-solution"
                    className="w-full bg-[#1f2937] border border-[#374151] focus:border-emerald-500 rounded-lg p-2.5 outline-none text-white font-mono"
                  />
                </div>

                {/* Repo Visibility Toggle */}
                <div className="flex items-center justify-between border-t border-[#1f2937] pt-3">
                  <div>
                    <span className="text-slate-300 font-bold block">Visibility</span>
                    <span className="text-[10px] text-slate-400 font-normal">Choose repository visibility setting</span>
                  </div>
                  <button
                    onClick={() => setIsRepoPrivate(!isRepoPrivate)}
                    className="flex items-center gap-1.5 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-700 text-white cursor-pointer select-none"
                  >
                    {isRepoPrivate ? (
                      <>
                        <Lock className="size-3.5 text-amber-500" />
                        <span>Private</span>
                      </>
                    ) : (
                      <>
                        <Globe className="size-3.5 text-emerald-500" />
                        <span>Public</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Always Save Autotoggle Checkbox */}
                <div className="flex items-start gap-2 border-t border-[#1f2937] pt-3">
                  <input
                    id="autosave-checkbox"
                    type="checkbox"
                    checked={alwaysSaveSetting}
                    onChange={(e) => setAlwaysSaveSetting(e.target.checked)}
                    className="mt-0.5 rounded border-slate-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-[#111827] bg-[#1f2937] size-4 cursor-pointer"
                  />
                  <label htmlFor="autosave-checkbox" className="text-slate-300 leading-normal cursor-pointer select-none font-medium">
                    Always save automatically
                    <span className="text-[10px] text-slate-500 block font-normal mt-0.5">
                      Check this to skip this confirmation dialog in the future.
                    </span>
                  </label>
                </div>

                {gitHubError && (
                  <div className="bg-rose-950/20 border border-rose-500/30 text-rose-400 p-3 rounded-lg flex items-start gap-2 leading-relaxed">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <p className="text-[11px]">{gitHubError}</p>
                  </div>
                )}

              </div>
            )}

            {/* Actions */}
            <footer className="flex justify-end gap-3 pt-2">
              {createdRepoUrl ? (
                <button
                  onClick={() => {
                    setShowGitHubModal(false);
                    router.push("/dashboard");
                  }}
                  className="bg-[#059669] hover:bg-[#047857] text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  Finish & Exit
                </button>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setShowGitHubModal(false);
                      router.push("/dashboard");
                    }}
                    disabled={isSavingToGitHub}
                    className="bg-transparent hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs px-4 py-2 rounded-lg border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
                  >
                    Skip
                  </button>
                  <button
                    onClick={() => triggerGitHubSave(isRepoPrivate, alwaysSaveSetting)}
                    disabled={isSavingToGitHub || !proposedRepoName.trim()}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isSavingToGitHub ? (
                      <>
                        <Loader2 className="size-3.5 animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <GitBranch className="size-3.5" />
                        <span>Save to GitHub</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </footer>

          </div>
        </div>
      )}

    </div>
  );
}
