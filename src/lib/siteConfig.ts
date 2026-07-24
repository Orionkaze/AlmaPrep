// Single source of truth for the deployed site's origin. Everything that needs
// an absolute URL (metadataBase, Open Graph, JSON-LD, sitemap, robots) reads
// this — so pointing the whole site at a new subdomain is one env var, set at
// deploy time, with no code changes.
//
// Set NEXT_PUBLIC_SITE_URL in the deployment environment (no trailing slash),
// e.g. NEXT_PUBLIC_SITE_URL=https://almaprep.conyso.com
//
// The fallback below is only used when the env var is unset (local dev / a
// forgotten config). Update it to the real production subdomain once decided.
const FALLBACK_SITE_URL = "https://almaprep.conyso.com";

export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || FALLBACK_SITE_URL
).replace(/\/+$/, "");
