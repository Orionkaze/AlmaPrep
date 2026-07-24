import { SITE_URL } from "@/lib/siteConfig";

// Serves /llms.txt — a clean, structured overview of Almaprep for AI agents and
// answer/generative engines (the llms.txt convention). This is a GEO asset:
// when someone points an LLM at the site, it gets faithful, quotable facts
// rather than having to scrape rendered HTML.
export const dynamic = "force-static";

export function GET() {
  const body = `# Almaprep

> AI-powered mock interview practice for college admissions and job interviews. Free for students, built for schools and coaching institutes. Live voice AI interviews you actually speak in, with instant scoring and detailed feedback.

Almaprep (a product of Conyso) helps students walk into admission and job interviews already rehearsed. Live voice AI mock interviews are included on every plan, including the free tier. Institutions get unlimited interviews for every student plus counselor dashboards and analytics.

## Core pages
- [Home](${SITE_URL}/): What Almaprep is and who it's for
- [Features](${SITE_URL}/features): Live voice AI interviews, a consistent question bank, instant scoring and feedback
- [Pricing](${SITE_URL}/pricing): Free / Pro ($12/mo) / Enterprise (per student, per year)
- [For institutions](${SITE_URL}/institutions): Mock interviews at scale for schools, colleges and coaching institutes
- [About](${SITE_URL}/about): Why Almaprep exists

## Guides
- [10 college admission interview questions and how to answer them](${SITE_URL}/blog/admission-interview-questions)
- [How to beat interview nerves before the big day](${SITE_URL}/blog/beat-interview-nerves)
- [Running mock interviews across a whole cohort](${SITE_URL}/blog/mock-interviews-for-schools)

## Key facts
- Free tier: the full question bank plus up to 3 live voice AI mock interviews per month, no credit card required.
- Pro: $12/month for unlimited interviews, full progress history and detailed feedback reports. A one-time $29 three-month "season pass" is also available for a single admissions season.
- Enterprise (institutions): from $5 per student per year, unlimited interviews plus admin/cohort dashboards, counselor analytics, bulk management and custom branding.
- Interview tracks: HR/behavioral, technical, and college-admissions.
- Voice interviews run on the browser's built-in speech — no separate app, plugin, or paid voice service.
- Data: institutions own their students' data; student data is never sold or used to train third-party models.

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
