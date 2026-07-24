import type { Metadata } from "next";
import { SITE_URL } from "./siteConfig";

// Shared SEO helpers so every marketing page gets a consistent, correct set of
// title / description / canonical / Open Graph / Twitter tags. The root layout
// sets metadataBase + the "%s | Almaprep" title template, so `title` here is the
// page-specific part only; canonical is a path and Next resolves it absolute.

type PageMetaArgs = {
  title: string;
  description: string;
  path: string; // e.g. "/pricing" (leading slash, no origin)
  type?: "website" | "article";
};

export function pageMetadata({ title, description, path, type = "website" }: PageMetaArgs): Metadata {
  const url = `${SITE_URL}${path}`;
  const ogTitle = `${title} | Almaprep`;
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      title: ogTitle,
      description,
      url,
      siteName: "Almaprep",
      type,
      images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Almaprep — AI Mock Interview Practice" }],
    },
    twitter: {
      card: "summary_large_image",
      title: ogTitle,
      description,
      images: ["/og-image.png"],
    },
  };
}

// ── JSON-LD builders ────────────────────────────────────────────────────────

export function organizationLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE_URL}/#org`,
    name: "Almaprep",
    alternateName: "Almaprep AI Mock Interviews",
    url: SITE_URL,
    logo: `${SITE_URL}/favicon.png`,
    description:
      "AI-powered mock interview practice for college admissions and job interviews — free for students, built for schools.",
    // Entity signals help answer/generative engines understand what Almaprep is
    // and what it's an authority on.
    knowsAbout: [
      "Mock interviews",
      "College admission interviews",
      "Interview preparation",
      "Behavioral interview questions",
      "Technical interviews",
      "Voice AI interview practice",
    ],
    areaServed: "Worldwide",
    audience: {
      "@type": "Audience",
      audienceType: "Students, schools, colleges, and coaching institutes",
    },
    parentOrganization: { "@type": "Organization", name: "Conyso", url: "https://conyso.com" },
    sameAs: ["https://conyso.com"],
  };
}

export function websiteLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE_URL}/#website`,
    name: "Almaprep",
    url: SITE_URL,
    publisher: { "@id": `${SITE_URL}/#org` },
  };
}

export function breadcrumbLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function faqLd(qas: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: qas.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export function blogPostingLd(args: {
  headline: string;
  description: string;
  path: string;
  datePublished: string;
  dateModified?: string;
}) {
  const url = `${SITE_URL}${args.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: args.headline,
    description: args.description,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: `${SITE_URL}/og-image.png`,
    datePublished: args.datePublished,
    dateModified: args.dateModified || args.datePublished,
    author: { "@type": "Organization", name: "Almaprep", url: SITE_URL },
    publisher: { "@id": `${SITE_URL}/#org` },
    // Voice / answer-engine target: the title and the "In short" answer callout.
    speakable: {
      "@type": "SpeakableSpecification",
      cssSelector: ["h1", ".aeo-answer"],
    },
  };
}
