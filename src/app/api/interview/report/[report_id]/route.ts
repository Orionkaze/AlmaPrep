import { NextResponse } from "next/server";
import { getReportById, getSessionById, getChallengeById } from "@/lib/interviewDb";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ report_id: string }> }
) {
  try {
    const { report_id } = await params;

    if (!report_id) {
      return NextResponse.json({ error: "Missing report_id" }, { status: 400 });
    }

    const report = await getReportById(report_id);
    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    const session = await getSessionById(report.session_id);
    const challenge = session ? await getChallengeById(session.challenge_id) : null;

    return NextResponse.json({
      ...report,
      challenge_title: challenge ? challenge.title : "Unknown Challenge",
      session
    });
  } catch (err: any) {
    console.error("Error fetching report details:", err);
    return NextResponse.json({ error: err.message || "Internal server error" }, { status: 500 });
  }
}
