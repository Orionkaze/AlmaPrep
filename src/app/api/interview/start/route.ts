import { NextResponse } from "next/server";
import { getChallengeById, createSession, getChallenges } from "@/lib/interviewDb";
import { getRequestUserId } from "@/lib/getRequestUserId";

export async function GET() {
  try {
    // The picker needs to render a list, not to know the answers. This route
    // used to return whole challenge rows — including hidden_tests and
    // expected_outcomes — to any caller, signed in or not. The workspace still
    // receives the tests it needs when a session is created below.
    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const challenges = await getChallenges();
    const listing = challenges.map((c) => ({
      id: c.id,
      title: c.title,
      description: c.description,
      challenge_type: c.challenge_type,
      difficulty: c.difficulty,
      language: c.language,
    }));
    return NextResponse.json({ challenges: listing });
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

    const challenge = await getChallengeById(challenge_id);
    if (!challenge) {
      return NextResponse.json({ error: "Challenge not found" }, { status: 400 });
    }

    const session = await createSession(userId, challenge_id, challenge.starter_code);

    return NextResponse.json({
      session_id: session.id,
      challenge
    });
  } catch (err) {
    console.error("Error starting interview session:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
