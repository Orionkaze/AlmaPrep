import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

// Public, indexable routes only — the marketing site + public demo. Auth'd
// product routes (dashboard, interview, login/signup, checkout) are excluded
// on purpose and are also disallowed in robots.ts.
export default function sitemap(): MetadataRoute.Sitemap {
  const routes: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"]; priority: number }> = [
    { path: "/", changeFrequency: "weekly", priority: 1.0 },
    { path: "/features", changeFrequency: "monthly", priority: 0.8 },
    { path: "/institutions", changeFrequency: "monthly", priority: 0.9 },
    { path: "/institutions/demo", changeFrequency: "monthly", priority: 0.6 },
    { path: "/pricing", changeFrequency: "monthly", priority: 0.8 },
    { path: "/contact-sales", changeFrequency: "yearly", priority: 0.5 },
    { path: "/about", changeFrequency: "monthly", priority: 0.5 },
    { path: "/blog", changeFrequency: "weekly", priority: 0.6 },
    { path: "/blog/admission-interview-questions", changeFrequency: "monthly", priority: 0.6 },
    { path: "/blog/beat-interview-nerves", changeFrequency: "monthly", priority: 0.6 },
    { path: "/blog/mock-interviews-for-schools", changeFrequency: "monthly", priority: 0.6 },
    { path: "/privacy", changeFrequency: "yearly", priority: 0.3 },
    { path: "/terms", changeFrequency: "yearly", priority: 0.3 },
  ];

  const lastModified = new Date();
  return routes.map(({ path, changeFrequency, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
