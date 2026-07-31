import Link from "next/link"
import Header from "@/components/almaprep/Header"
import Footer from "@/components/almaprep/Footer"

export const metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
}

/**
 * 404. Without this, a mistyped URL served Next's unstyled default page — no
 * header, no way onward, and nothing that looks like the product.
 */
export default function NotFound() {
  return (
    <div className="almaprep-theme">
      <Header />
      <main
        style={{
          minHeight: "60vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "24px",
        }}
      >
        <div style={{ maxWidth: "44ch", textAlign: "center" }}>
          <span className="pill">404</span>
          <h1 style={{ fontSize: "1.6rem", margin: "16px 0 12px" }}>We couldn&apos;t find that page</h1>
          <p style={{ color: "var(--muted)", marginBottom: "24px" }}>
            The link may be out of date, or the page may have moved.
          </p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", flexWrap: "wrap" }}>
            <Link className="btn btn-primary" href="/">
              Go home
            </Link>
            <Link className="btn btn-ghost" href="/interview/setup">
              Start a practice interview
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
