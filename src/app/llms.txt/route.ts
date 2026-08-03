import { SITE_URL } from "@/lib/siteConfig";
import { PLANS, PRO_BILLING_CYCLES, formatPrice } from "@/config/plans";

// Serves /llms.txt — a clean, structured overview of Almaprep for AI agents and
// answer/generative engines (the llms.txt convention). This is a GEO asset:
// when someone points an LLM at the site, it gets faithful, quotable facts
// rather than having to scrape rendered HTML.
export const dynamic = "force-static";

export function GET() {
  const body = `# Almaprep

> AI-powered mock interview practice for college admissions and job interviews. Free for students, built for schools and coaching institutes. Speak or type your answers, with instant scoring and detailed feedback.

Almaprep (a product of Conyso) helps students walk into admission and job interviews already rehearsed. Interviews run in the browser: the interviewer's questions are read aloud, and you can answer by speaking (using your browser's built-in speech recognition) or by typing. Institutions get unlimited interviews for every student.

## Core pages
- [Home](${SITE_URL}/): What Almaprep is and who it's for
- [Features](${SITE_URL}/features): Spoken or typed answers, a consistent question bank, instant scoring and feedback
- [Pricing](${SITE_URL}/pricing): Free / Pro ($12/mo) / Enterprise (per student, per year)
- [For institutions](${SITE_URL}/institutions): Mock interviews at scale for schools, colleges and coaching institutes
- [About](${SITE_URL}/about): Why Almaprep exists

## Guides
- [10 college admission interview questions and how to answer them](${SITE_URL}/blog/admission-interview-questions)
- [How to beat interview nerves before the big day](${SITE_URL}/blog/beat-interview-nerves)
- [Running mock interviews across a whole cohort](${SITE_URL}/blog/mock-interviews-for-schools)

## Key facts
- Free tier: the full question bank plus up to ${PLANS.free.entitlements.monthlyInterviews} AI mock interviews per month, no credit card required.
- Pro: ${formatPrice(PRO_BILLING_CYCLES.monthly.total)}/month for unlimited interviews, full progress history and detailed feedback reports. A one-time ${formatPrice(PRO_BILLING_CYCLES.season.total)} three-month "season pass" is also available for a single admissions season.
- Enterprise (institutions): custom pricing, unlimited interviews for every student, with onboarding and rollout support.
- Interview tracks: HR/behavioral, technical, and college-admissions.
- Answers can be spoken or typed. Speech is handled by the browser's own speech recognition and speech synthesis — there is no separate app, plugin, or paid voice service, and no phone or meeting to join.
- Also included: resume analysis, GitHub-repo-based technical interviews, and a coding challenge workspace that runs tests in your browser.
- Data: institutions own their students' data; student data is never sold.

## Contact
- Partnerships and institutions: partnerships@almaprep.app
- Privacy: privacy@almaprep.app
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
