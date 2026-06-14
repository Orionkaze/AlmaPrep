import Link from "next/link"

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="wrap">
        <div className="footer-grid">
          <div>
            <Link href="/" className="brand">
              <svg className="mark" viewBox="0 0 80 80" aria-hidden="true">
                <rect width="80" height="80" rx="18" fill="#10b981" />
                <path d="M40 12 L16 67 L29 67 L36 50 L44 50 L51 67 L64 67 Z" fill="#062b22" />
                <rect x="30" y="40" width="20" height="8" fill="#10b981" />
              </svg>
              Almaprep
            </Link>
            <p className="footer-tagline">
              Mock interviews that get students into college. Free for students, built for schools and institutes.
            </p>
          </div>
          <div>
            <h4>Product</h4>
            <ul>
              <li><Link href="/features">Features</Link></li>
              <li><Link href="/pricing">Pricing</Link></li>
              <li><Link href="/institutions">For Institutions</Link></li>
              <li><Link href="/signup">Start free</Link></li>
            </ul>
          </div>
          <div>
            <h4>Company</h4>
            <ul>
              <li><Link href="/about">About</Link></li>
              <li><Link href="/blog">Blog</Link></li>
              <li><Link href="/login">Log in</Link></li>
            </ul>
          </div>
          <div>
            <h4>Legal</h4>
            <ul>
              <li><Link href="/privacy">Privacy</Link></li>
              <li><Link href="/terms">Terms</Link></li>
            </ul>
          </div>
        </div>
        <div className="footer-bottom">
          <span>&copy; 2026 Almaprep. All rights reserved.</span>
          <span>Made for students and the schools that back them.</span>
        </div>
      </div>
    </footer>
  )
}
