import { NextResponse } from "next/server";
import { getReportById, getSessionById, getChallengeById } from "@/lib/interviewDb";
import { getRequestUserId } from "@/lib/getRequestUserId";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ report_id: string }> }
) {
  try {
    const { report_id } = await params;

    if (!report_id) {
      return NextResponse.json({ error: "Missing report_id" }, { status: 400 });
    }

    const userId = await getRequestUserId();
    if (!userId) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const report = await getReportById(report_id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }
    if (report.user_id !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const session = await getSessionById(report.session_id);
    const challenge = session ? await getChallengeById(session.challenge_id) : null;

    return NextResponse.json({
      ...report,
      challenge_title: challenge ? challenge.title : "Unknown Challenge",
      session
    });
  } catch (err) {
    console.error("Error fetching report details:", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Internal server error" }, { status: 500 });
  }
}
