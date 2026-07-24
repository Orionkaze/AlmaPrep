import fs from "fs";
import path from "path";
import { createClient } from "@/lib/supabase/server";
import type { TestResults } from "@/types/db";

// Define the environment check for mock mode
const isMockMode =
  process.env.NODE_ENV === "development" &&
  (!process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.NEXT_PUBLIC_SUPABASE_URL.includes("evdfkeikrrsdthnekrrz.supabase.co"));

const MOCK_DB_PATH = path.join(process.cwd(), "data", "interview_mock_db.json");

interface MockDb {
  challenges: Challenge[];
  interview_sessions: InterviewSession[];
  interview_reports: InterviewReport[];
}

// Helper to get mock data from JSON file
function getMockDb(): MockDb {
  if (!fs.existsSync(MOCK_DB_PATH)) {
    const initial: MockDb = {
      challenges: [],
      interview_sessions: [],
      interview_reports: []
    };
    fs.mkdirSync(path.dirname(MOCK_DB_PATH), { recursive: true });
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(initial, null, 2), "utf8");
    return initial;
  }
  try {
    const content = fs.readFileSync(MOCK_DB_PATH, "utf8");
    return JSON.parse(content) as MockDb;
  } catch (e) {
    console.error("Error reading mock database JSON:", e);
    return { challenges: [], interview_sessions: [], interview_reports: [] };
  }
}

// Helper to save mock data to JSON file
function saveMockDb(data: MockDb) {
  try {
    fs.writeFileSync(MOCK_DB_PATH, JSON.stringify(data, null, 2), "utf8");
  } catch (e) {
    console.error("Error writing mock database JSON:", e);
  }
}

export interface Challenge {
  id: string;
  title: string;
  description: string;
  challenge_type: "bug_fix" | "feature" | "refactor" | "security" | "performance";
  difficulty: "easy" | "medium" | "hard";
  starter_code: Record<string, string>;
  hidden_tests: Record<string, unknown>[];
  expected_outcomes: Record<string, unknown>;
  language?: string;
  created_at?: string;
}

export interface InterviewSession {
  id: string;
  user_id: string;
  challenge_id: string;
  conversation: Record<string, unknown>[];
  current_codebase: Record<string, string>;
  submitted_code: Record<string, string> | null;
  status: "in_progress" | "submitted" | "evaluated";
  started_at: string;
  submitted_at: string | null;
}

export interface InterviewReport {
  id: string;
  session_id: string;
  user_id: string;
  scores: Record<string, number>;
  strengths: string[];
  weaknesses: string[];
  hiring_recommendation: string;
  recommendation_reasoning: string;
  overall_score: number;
  test_results: TestResults;
  generated_at?: string;
}

export async function getChallenges(): Promise<Challenge[]> {
  if (isMockMode) {
    const db = getMockDb();
    return db.challenges;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Supabase getChallenges error:", error);
    throw error;
  }
  return data || [];
}

export async function getChallengeById(id: string): Promise<Challenge | null> {
  if (isMockMode) {
    const db = getMockDb();
    return db.challenges.find((c: Challenge) => c.id === id) || null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("challenges")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Supabase getChallengeById error:", error);
    throw error;
  }
  return data;
}

export async function createSession(userId: string, challengeId: string, starterCode: Record<string, string>): Promise<InterviewSession> {
  const newSession: Partial<InterviewSession> = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
    user_id: userId,
    challenge_id: challengeId,
    conversation: [],
    current_codebase: starterCode,
    submitted_code: null,
    status: "in_progress",
    started_at: new Date().toISOString(),
    submitted_at: null
  };

  if (isMockMode) {
    const db = getMockDb();
    db.interview_sessions.push(newSession as InterviewSession);
    saveMockDb(db);
    return newSession as InterviewSession;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .insert({
      user_id: userId,
      challenge_id: challengeId,
      conversation: [],
      current_codebase: starterCode,
      status: "in_progress"
    })
    .select("*")
    .single();

  if (error) {
    console.error("Supabase createSession error:", error);
    throw error;
  }
  return data;
}

export async function getSessionById(id: string): Promise<InterviewSession | null> {
  if (isMockMode) {
    const db = getMockDb();
    return db.interview_sessions.find((s: InterviewSession) => s.id === id) || null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Supabase getSessionById error:", error);
    throw error;
  }
  return data;
}

export async function updateSession(id: string, updates: Partial<InterviewSession>): Promise<InterviewSession> {
  if (isMockMode) {
    const db = getMockDb();
    const idx = db.interview_sessions.findIndex((s: InterviewSession) => s.id === id);
    if (idx === -1) throw new Error("Session not found");
    db.interview_sessions[idx] = { ...db.interview_sessions[idx], ...updates };
    saveMockDb(db);
    return db.interview_sessions[idx];
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_sessions")
    .update(updates)
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase updateSession error:", error);
    throw error;
  }
  return data;
}

export async function createReport(reportData: Omit<InterviewReport, "id" | "generated_at">): Promise<InterviewReport> {
  const newReport: Partial<InterviewReport> = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2) + Date.now().toString(36),
    ...reportData,
    generated_at: new Date().toISOString()
  };

  if (isMockMode) {
    const db = getMockDb();
    db.interview_reports.push(newReport as InterviewReport);
    saveMockDb(db);
    return newReport as InterviewReport;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_reports")
    .insert(reportData)
    .select("*")
    .single();

  if (error) {
    console.error("Supabase createReport error:", error);
    throw error;
  }
  return data;
}

export async function getReportById(id: string): Promise<InterviewReport | null> {
  if (isMockMode) {
    const db = getMockDb();
    return db.interview_reports.find((r: InterviewReport) => r.id === id) || null;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("interview_reports")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    console.error("Supabase getReportById error:", error);
    throw error;
  }
  return data;
}

// Seed helper specifically for local development
export function seedChallengeMock(challenge: Challenge) {
  if (!isMockMode) return;
  const db = getMockDb();
  const exists = db.challenges.some((c: Challenge) => c.title === challenge.title);
  if (!exists) {
    db.challenges.push(challenge);
    saveMockDb(db);
  }
}
