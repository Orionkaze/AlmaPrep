import { createClient } from "@/lib/supabase/server";
import type {
  BadgeRow,
  UserRow,
} from "@/types/db";

/** Just the part of a PostgREST error this file branches on. */
type PostgrestErrorLike = { code?: string; message?: string };

/**
 * The badge rules read a handful of JSON columns that have no generated types.
 * These describe only the fields actually inspected below — narrow on purpose,
 * so a rule that starts reading a new field has to say so here first.
 */
type InterviewFeedbackSummary = { score?: number };

type PhysicalMetricSample = {
  bodyLanguageScore?: number;
  posture_score?: number;
};

type SpeakingAnalysis = {
  sessionSummary?: { metrics?: { totalFillerCount?: number } };
};

type BehavioralAnalysisRow = {
  session_id: string;
  physical_metrics?: PhysicalMetricSample[] | null;
  speaking_analysis?: SpeakingAnalysis | null;
};

type InterviewWithBadgeInputs = {
  id: string;
  category?: string | null;
  is_flagged?: boolean | null;
  feedback?: InterviewFeedbackSummary[] | null;
  proctoring_log?: { totalCount?: number } | null;
};

/**
 * Badge evaluation engine.
 *
 * SERVER-INTERNAL ON PURPOSE. This takes a userId argument, which is safe only
 * because it is never a server action — it used to live in a "use server" file,
 * which made it a public RPC endpoint that any visitor could call with someone
 * else's id. Call it from a route/action that has already resolved the user.
 */
export async function checkAndAwardBadges(userId: string) {
  try {
    const supabase = await createClient();

    // 1. Fetch user profile first (with fallback for missing current_streak)
    let userRes = await supabase
      .from("users")
      .select("id, username, avatar_url, resume_text, current_streak, created_at")
      .eq("id", userId)
      .single() as unknown as { data: UserRow | null; error?: PostgrestErrorLike };

    if (userRes.error && userRes.error.code === '42703') {
      userRes = await supabase
        .from("users")
        .select("id, username, avatar_url, resume_text, created_at")
        .eq("id", userId)
        .single() as unknown as { data: UserRow | null; error?: PostgrestErrorLike };
    }

    const user = userRes.data;

    // 2. Fetch the rest of the relevant data in parallel
    const [
      earnedRes,
      interviewsRes,
      sessionsRes,
      solutionsRes,
      githubRes,
      behavioralRes
    ] = await Promise.all([
      supabase.from("user_badges").select("badge_slug").eq("user_id", userId),
      supabase
        .from("interviews")
        .select("id, category, created_at, feedback(score), proctoring_log, is_flagged")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false }),
      supabase
        .from("interview_sessions")
        .select("id, started_at, submitted_at, challenge_id")
        .eq("user_id", userId)
        .in("status", ["completed", "evaluated"])
        .order("started_at", { ascending: false }),
      supabase
        .from("coding_solutions")
        .select("challenge_id, attempts, created_at, language, quality_score, test_results")
        .eq("user_id", userId),
      supabase.from("github_analysis").select("user_id").eq("user_id", userId).maybeSingle(),
      supabase
        .from("behavioral_analysis")
        .select("session_id, physical_metrics, speaking_analysis")
        .eq("user_id", userId)
    ]);

    if (!user) return { success: false, error: "User not found" };

    const earnedBadges = earnedRes.data;
    const interviews = interviewsRes.data;
    const codingSessions = sessionsRes.data;
    const codingSolutions = solutionsRes.data;
    const githubAnalysis = githubRes.data;
    const behavioralAnalysis = behavioralRes.data;

    const earnedSlugs = new Set((earnedBadges || []).map((b: { badge_slug: string }) => b.badge_slug));
    const newBadges: string[] = [];

    // Helper to evaluate and queue badge
    const evaluate = (slug: string, condition: boolean) => {
      if (condition && !earnedSlugs.has(slug)) {
        newBadges.push(slug);
        earnedSlugs.add(slug); // prevent duplicate triggers in the same run
      }
    };

    // Prepare aggregate stats
    const mockCount = interviews?.length || 0;
    const codingCount = codingSessions?.length || 0;
    const streak = user.current_streak || 0;
    const createdAt = new Date(user.created_at);
    
    // Process Mock Interviews for specific metrics
    let totalPerfectScores = 0;
    let zeroFillerWordInterviews = 0;
    let highBodyLanguageInterviews = 0;
    let lowFillerWordInterviews = 0;
    let zeroViolationInterviews = 0;
    
    // Group domains for mock interviews
    const domains = new Set<string>();
    
    let consecutiveHighScores = 0;
    let maxConsecutiveHighScores = 0;
    
    // Reverse for chronological checks if needed, but we ordered DESC, so reverse to ASC
    const ascInterviews = [...(interviews || [])].reverse() as unknown as InterviewWithBadgeInputs[];

    ascInterviews.forEach(interview => {
      const fb = interview.feedback?.[0];
      if (!fb) {
        consecutiveHighScores = 0;
        return;
      }
      
      if (interview.category) domains.add(interview.category);
      
      const score = fb.score ?? 0;
      if (score >= 100) totalPerfectScores++;
      if (score >= 80) {
        consecutiveHighScores++;
        if (consecutiveHighScores > maxConsecutiveHighScores) maxConsecutiveHighScores = consecutiveHighScores;
      } else {
        consecutiveHighScores = 0;
      }
      
      // Match behavioral analysis for this interview session
      const behavior = ((behavioralAnalysis || []) as unknown as BehavioralAnalysisRow[])
        .find(b => b.session_id === interview.id);
      if (behavior) {
        // Parse eye contact / posture from physical_metrics
        const physical = behavior.physical_metrics || [];
        if (Array.isArray(physical) && physical.length > 0) {
          const avgBodyLanguage = physical.reduce((acc: number, item: PhysicalMetricSample) => {
            return acc + (item.bodyLanguageScore ?? item.posture_score ?? 0);
          }, 0) / physical.length;
          if (avgBodyLanguage >= 90) highBodyLanguageInterviews++;
        }

        // Parse filler words from speaking_analysis
        const totalFiller = behavior.speaking_analysis?.sessionSummary?.metrics?.totalFillerCount;
        if (totalFiller === 0) zeroFillerWordInterviews++;
        if (totalFiller !== undefined && totalFiller < 3) lowFillerWordInterviews++;
      }

      // Parse violations from proctoring_log
      const violationsCount = interview.proctoring_log?.totalCount ?? 0;
      if (violationsCount === 0 && !interview.is_flagged) zeroViolationInterviews++;
    });

    // Process Coding Sessions
    let firstTrySolves = 0;
    let perfectQualitySolves = 0;
    let fastSolves = 0; // under 5 mins
    const jsAndPythonSolves = new Set<string>();

    codingSolutions?.forEach((sol) => {
      const session = codingSessions?.find(s => s.challenge_id === sol.challenge_id);
      
      if (sol.attempts === 1 && sol.test_results?.passed === sol.test_results?.total) firstTrySolves++;
      if (sol.quality_score === 10) perfectQualitySolves++;
      if (sol.language) jsAndPythonSolves.add(sol.language.toLowerCase());
      
      if (session) {
        const start = new Date(session.started_at).getTime();
        const end = new Date(session.submitted_at || sol.created_at).getTime();
        if ((end - start) < 5 * 60 * 1000) fastSolves++;
      }
    });

    // --- EVALUATE BADGE LOGIC ---

    // Getting Started
    evaluate('first-step', mockCount > 0);
    evaluate('code-debut', codingCount > 0);
    const profile100 = !!(user.username && user.avatar_url && user.resume_text && githubAnalysis);
    evaluate('profile-pro', profile100);
    evaluate('resume-ready', !!user.resume_text);
    evaluate('github-connected', !!githubAnalysis);
    
    const daysSinceSignup = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 3600 * 24));
    evaluate('early-bird', streak >= 3 && daysSinceSignup <= 7);

    // Streak
    evaluate('on-a-roll', streak >= 3);
    evaluate('week-warrior', streak >= 7);
    evaluate('fortnight-fighter', streak >= 14);
    evaluate('monthly-grinder', streak >= 30);
    evaluate('unstoppable', streak >= 60);
    evaluate('century-club', streak >= 100);
    evaluate('legend', streak >= 365);

    // Interview
    evaluate('nervous-no-more', mockCount >= 5);
    evaluate('interview-veteran', mockCount >= 25);
    evaluate('interview-machine', mockCount >= 50);
    evaluate('century-interviewer', mockCount >= 100);
    evaluate('domain-hopper', domains.size >= 5);
    evaluate('domain-master', domains.size >= 15);
    evaluate('domain-legend', domains.size >= 20);
    evaluate('perfect-score', totalPerfectScores >= 1);
    evaluate('speed-talker', zeroFillerWordInterviews >= 1);
    evaluate('consistent-performer', maxConsecutiveHighScores >= 10);

    // Coding
    // bug-slayer: Pass all test cases on first attempt (at least one)
    evaluate('bug-slayer', firstTrySolves >= 1);
    evaluate('optimizer', perfectQualitySolves >= 1);
    evaluate('polyglot', jsAndPythonSolves.has('javascript') && (jsAndPythonSolves.has('python') || jsAndPythonSolves.has('python3')));
    evaluate('problem-solver', codingCount >= 10);
    evaluate('code-veteran', codingCount >= 25);
    evaluate('code-machine', codingCount >= 50);
    evaluate('first-try', firstTrySolves >= 5);
    evaluate('speed-coder', fastSolves >= 1);

    // Skill
    evaluate('body-language-boss', highBodyLanguageInterviews >= 3);
    evaluate('proctoring-pro', zeroViolationInterviews >= 1);
    evaluate('filler-free', lowFillerWordInterviews >= 3);

    // Progress
    // Weekend Warrior: Check if there's an interview on Saturday AND Sunday
    const hasSaturday = interviews?.some((i) => new Date(i.created_at).getDay() === 6);
    const hasSunday = interviews?.some((i) => new Date(i.created_at).getDay() === 0);
    evaluate('weekend-warrior', !!(hasSaturday && hasSunday));

    // Overachiever: 3+ activities in a single day
    const datesCount: Record<string, number> = {};
    const allActivityDates: Array<{ created_at?: string; started_at?: string }> = [...(interviews || []), ...(codingSessions || [])];
    allActivityDates.forEach((act) => {
      const d = new Date(act.created_at || act.started_at || Date.now()).toISOString().split('T')[0];
      datesCount[d] = (datesCount[d] || 0) + 1;
    });
    const maxActsInDay = Math.max(0, ...Object.values(datesCount));
    evaluate('overachiever', maxActsInDay >= 3);

    // Special
    // 'overachiever' is 3+ activities of any kind in a day. This one asks for a
    // genuinely longer sitting, otherwise the two always unlocked together and
    // one of them meant nothing.
    const maxInterviewsInDay = Math.max(
      0,
      ...Object.values(
        (interviews || []).reduce<Record<string, number>>((acc, i) => {
          const day = new Date(i.created_at).toISOString().split("T")[0];
          acc[day] = (acc[day] || 0) + 1;
          return acc;
        }, {})
      )
    );
    evaluate('marathon-session', maxInterviewsInDay >= 5);
    
    // 2. Award newly earned badges
    if (newBadges.length > 0) {
      const inserts = newBadges.map(slug => ({
        user_id: userId,
        badge_slug: slug,
        earned_at: new Date().toISOString()
      }));

      // INSERT ... ON CONFLICT DO NOTHING
      const { error: insertError } = await supabase
        .from("user_badges")
        .upsert(inserts, { onConflict: 'user_id, badge_slug', ignoreDuplicates: true });

      if (insertError) {
        console.error("Failed to insert new badges:", insertError);
      }
    }

    // 3. Fetch detailed badge info to return to client for UI notification
    let awardedDetails: BadgeRow[] = [];
    if (newBadges.length > 0) {
      const { data: badgeDetails } = await supabase
        .from("badges")
        .select("*")
        .in("slug", newBadges) as unknown as { data: BadgeRow[] | null };

      awardedDetails = badgeDetails || [];
    }

    return { success: true, newlyEarned: awardedDetails };

  } catch (err) {
    console.error("checkAndAwardBadges error:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
