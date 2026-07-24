import { NextResponse } from "next/server";
import { getChallengeById, createSession, getChallenges } from "@/lib/interviewDb";
import { getRequestUserId } from "@/lib/getRequestUserId";

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
