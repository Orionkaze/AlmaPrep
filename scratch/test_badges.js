const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local
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

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const userId = "31b61e24-25ea-4639-8c48-c1f480167386";

async function testAwardBadges() {
  try {
    console.log("1. Fetching user profile...");
    let userRes = await supabase
      .from("users")
      .select("id, username, avatar_url, resume_text, current_streak, created_at")
      .eq("id", userId)
      .single();
    
    if (userRes.error && userRes.error.code === '42703') {
      console.log("Column current_streak missing, falling back...");
      userRes = await supabase
        .from("users")
        .select("id, username, avatar_url, resume_text, created_at")
        .eq("id", userId)
        .single();
    }

    if (userRes.error) {
      console.error("User fetch error:", userRes.error);
      return;
    }
    
    const user = userRes.data;
    console.log("User profile fetched:", JSON.stringify(user, null, 2));

    console.log("2. Fetching other tables...");
    const [
      earnedRes,
      interviewsRes,
      codingRes,
      githubRes
    ] = await Promise.all([
      supabase.from("user_badges").select("badge_slug").eq("user_id", userId),
      supabase
        .from("interviews")
        .select("id, category, created_at, feedback(score, detailed_metrics)")
        .eq("user_id", userId)
        .eq("status", "completed")
        .order("created_at", { ascending: false }),
      supabase
        .from("interview_sessions")
        .select(
          "id, started_at, submitted_at, coding_solutions(attempts, created_at, language, quality_score, test_results)"
        )
        .eq("user_id", userId)
        .in("status", ["completed", "evaluated"])
        .order("started_at", { ascending: false }),
      supabase.from("github_analysis").select("id").eq("user_id", userId).maybeSingle()
    ]);

    console.log("Fetched user_badges count:", earnedRes.data?.length, "error:", earnedRes.error?.message);
    console.log("Fetched interviews count:", interviewsRes.data?.length, "error:", interviewsRes.error?.message);
    if (interviewsRes.data && interviewsRes.data.length > 0) {
      console.log("Sample interview:", JSON.stringify(interviewsRes.data[0], null, 2));
    }
    console.log("Fetched coding sessions count:", codingRes.data?.length, "error:", codingRes.error?.message);
    console.log("Fetched github analysis exists:", !!githubRes.data, "error:", githubRes.error?.message);

    const earnedSlugs = new Set((earnedRes.data || []).map(b => b.badge_slug));
    const newBadges = [];

    const evaluate = (slug, condition) => {
      if (condition && !earnedSlugs.has(slug)) {
        newBadges.push(slug);
        earnedSlugs.add(slug);
      }
    };

    const mockCount = interviewsRes.data?.length || 0;
    const codingCount = codingRes.data?.length || 0;
    const streak = user.current_streak || 0;

    evaluate('first-step', mockCount > 0);
    evaluate('code-debut', codingCount > 0);
    evaluate('resume-ready', !!user.resume_text);
    evaluate('github-connected', !!githubRes.data);

    console.log("Evaluated badges to award:", newBadges);

    if (newBadges.length > 0) {
      const inserts = newBadges.map(slug => ({
        user_id: userId,
        badge_slug: slug,
        earned_at: new Date().toISOString()
      }));

      console.log("Inserting new badges:", inserts);
      const { error: insertError } = await supabase
        .from("user_badges")
        .upsert(inserts, { onConflict: 'user_id, badge_slug', ignoreDuplicates: true });

      if (insertError) {
        console.error("Failed to insert new badges:", insertError);
      } else {
        console.log("Success: Badges inserted!");
      }
    }

  } catch (err) {
    console.error("Exception:", err);
  }
}

testAwardBadges();
