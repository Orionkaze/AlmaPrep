"use server";

import { createClient } from "@/lib/supabase/server";

export async function checkAndAwardBadges(userId: string) {
  try {
    const supabase = await createClient();

    // 1. Fetch ALL relevant data in parallel (batched queries)
    const [
      { data: user },
      { data: earnedBadges },
      { data: interviews },
      { data: codingSessions },
      { data: githubAnalysis }
    ] = await Promise.all([
      supabase.from("users").select("*").eq("id", userId).single(),
      supabase.from("user_badges").select("badge_slug").eq("user_id", userId),
      supabase.from("interviews").select("*, feedback(*)").eq("user_id", userId).eq("status", "completed").order("created_at", { ascending: false }),
      supabase.from("interview_sessions").select("*, coding_solutions(*), interview_reports(*)").eq("user_id", userId).in("status", ["completed", "evaluated"]).order("started_at", { ascending: false }),
      supabase.from("github_analysis").select("id").eq("user_id", userId).maybeSingle()
    ]);

    if (!user) return { success: false, error: "User not found" };

    const earnedSlugs = new Set((earnedBadges || []).map((b: any) => b.badge_slug));
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
    const totalActivities = mockCount + codingCount;
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
    const ascInterviews = [...(interviews || [])].reverse();
    
    ascInterviews.forEach(interview => {
      const fb = interview.feedback?.[0];
      if (!fb) {
        consecutiveHighScores = 0;
        return;
      }
      
      if (interview.category) domains.add(interview.category);
      
      if (fb.score >= 100) totalPerfectScores++;
      if (fb.score >= 80) {
        consecutiveHighScores++;
        if (consecutiveHighScores > maxConsecutiveHighScores) maxConsecutiveHighScores = consecutiveHighScores;
      } else {
        consecutiveHighScores = 0;
      }
      
      // Parse detailed feedback if it exists (assuming JSON stored metrics or extracting from text)
      // Since specific metrics like body language or filler words might be in structured JSON:
      const details = fb.detailed_metrics || {};
      if (details.fillerWords === 0) zeroFillerWordInterviews++;
      if (details.fillerWords !== undefined && details.fillerWords < 3) lowFillerWordInterviews++;
      if (details.bodyLanguageScore >= 90) highBodyLanguageInterviews++;
      if (details.violations === 0) zeroViolationInterviews++;
    });

    // Process Coding Sessions
    let firstTrySolves = 0;
    let perfectQualitySolves = 0;
    let fastSolves = 0; // under 5 mins
    let jsAndPythonSolves = new Set<string>();

    codingSessions?.forEach((session: any) => {
      const sol = session.coding_solutions?.[0];
      if (sol) {
        if (sol.attempts === 1 && sol.test_results?.passed === sol.test_results?.total) firstTrySolves++;
        if (sol.quality_score === 10) perfectQualitySolves++;
        if (sol.language) jsAndPythonSolves.add(sol.language.toLowerCase());
        
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
    const hasSaturday = interviews?.some(i => new Date(i.created_at).getDay() === 6);
    const hasSunday = interviews?.some(i => new Date(i.created_at).getDay() === 0);
    evaluate('weekend-warrior', !!(hasSaturday && hasSunday));

    // Overachiever: 3+ activities in a single day
    const datesCount: Record<string, number> = {};
    [...(interviews || []), ...(codingSessions || [])].forEach(act => {
      const d = new Date(act.created_at || act.started_at).toISOString().split('T')[0];
      datesCount[d] = (datesCount[d] || 0) + 1;
    });
    const maxActsInDay = Math.max(0, ...Object.values(datesCount));
    evaluate('overachiever', maxActsInDay >= 3);

    // Special
    evaluate('marathon-session', maxActsInDay >= 3); // similar to overachiever but maybe scoped to interviews, using general for now
    
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
    let awardedDetails = [];
    if (newBadges.length > 0) {
      const { data: badgeDetails } = await supabase
        .from("badges")
        .select("*")
        .in("slug", newBadges);
      
      awardedDetails = badgeDetails || [];
    }

    return { success: true, newlyEarned: awardedDetails };

  } catch (err: any) {
    console.error("checkAndAwardBadges error:", err);
    return { success: false, error: err.message };
  }
}
