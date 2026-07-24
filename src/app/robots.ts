import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/siteConfig";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Keep authenticated / conversion-funnel routes out of the index.
      disallow: ["/login", "/signup", "/forgot-password", "/reset-password", "/onboarding", "/dashboard", "/interview", "/checkout"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
