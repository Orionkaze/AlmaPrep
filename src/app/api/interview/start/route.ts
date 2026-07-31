import { NextResponse } from "next/server";
import { getChallengeById, createSession, getChallenges } from "@/lib/interviewDb";
import { getRequestUserId } from "@/lib/getRequestUserId";
import { getPostHogClient } from "@/lib/posthog-server";
import { getUserTier } from "@/lib/entitlements";
import { checkInterviewAllowance } from "@/lib/quota";

export async function GET() {
  try {
    const challenges = await getChallenges();
    return NextResponse.json({ challenges });
  } catch (err) {
    console.error("Error fetching challenges list:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const { challenge_id } = body;

    if (!challenge_id) {
      return NextResponse.json({ error: "Missing challenge_id" }, { status: 400 });
    }

    // Never trust a client-supplied user id — resolve it server-side from
    // the actual session, otherwise anyone could create sessions attributed
    // to an arbitrary user.
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    // Enforce interview allowance paywall check on the API endpoint
    const { tier, isDemo } = await getUserTier();
    if (!isDemo && userId !== "demo-user-id") {
      const allowance = await checkInterviewAllowance(userId, tier, Date.now(), true);
      if (!allowance.allowed) {
        return NextResponse.json({
          error: "quota_exceeded",
          message: "You've used all free interviews this month. Upgrade to Pro for unlimited access."
        }, { status: 429 });
      }
    }

    const challenge = await getChallengeById(challenge_id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
    }

    const session = await createSession(userId, challenge_id, challenge.starter_code);

    const posthog = getPostHogClient()
    if (posthog) {
      posthog.capture({
        distinctId: userId,
        event: "interview_session_started",
        properties: {
          session_id: session.id,
          challenge_id: challenge.id,
          challenge_title: challenge.title,
          difficulty: challenge.difficulty,
          language: challenge.language,
        },
      })
      await posthog.flush()
    }

    return NextResponse.json({
      session_id: session.id,
      challenge
    });
  } catch (err) {
    console.error("Error starting interview session:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
