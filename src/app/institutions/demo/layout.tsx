import { pageMetadata } from "@/lib/seo";

// The demo page itself is a client component (interactive dashboard), so its
// metadata lives here in a server-component layout.
export const metadata = pageMetadata({
  title: "Institution Dashboard Demo",
  description:
    "A live, clickable demo of the Almaprep institution dashboard: cohort progress, at-risk student flags, and counselor analytics for schools and colleges.",
  path: "/institutions/demo",
});

export default function DemoLayout({ children }: { children: React.ReactNode }) {
  return children;
}
