import { pageMetadata } from "@/lib/seo";

// The contact-sales page is a client component (interactive form), so its
// metadata lives here in a server-component layout.
export const metadata = pageMetadata({
  title: "Contact Sales — Almaprep for Institutions",
  description:
    "Talk to Almaprep about rolling out AI mock interviews across your school, college, or coaching program. Tell us your size and we'll put together a plan.",
  path: "/contact-sales",
});

export default function ContactSalesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
