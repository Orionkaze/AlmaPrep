"use client"

import { useState } from "react"
import Link from "next/link"
import ModeToggle from "./ModeToggle"

export default function Header() {
  const [open, setOpen] = useState(false)

  return (
    <header className="site-header">
      <div className="wrap">
        <nav className="nav" aria-label="Primary">
          <Link href="/" className="brand">
            <svg className="mark" viewBox="0 0 80 80" aria-hidden="true">
              <rect width="80" height="80" rx="18" fill="#059669" />
              <path d="M40 12 L16 67 L29 67 L36 50 L44 50 L51 67 L64 67 Z" fill="white" />
              <rect x="30" y="40" width="20" height="8" fill="#059669" />
            </svg>
            Almaprep
          </Link>
          <button
            className="nav-toggle"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            <span></span>
          </button>
          <ul className={`nav-links${open ? " open" : ""}`} id="nav-links">
            <li>
              <Link href="/features" onClick={() => setOpen(false)}>Features</Link>
            </li>
            <li>
              <Link href="/institutions" onClick={() => setOpen(false)}>For Institutions</Link>
            </li>
            <li>
              <Link href="/pricing" onClick={() => setOpen(false)}>Pricing</Link>
            </li>
            <li>
              <Link href="/blog" onClick={() => setOpen(false)}>Blog</Link>
            </li>
            <li>
              <Link href="/about" onClick={() => setOpen(false)}>About</Link>
            </li>
            <li className="flex items-center px-2">
              <ModeToggle />
            </li>
            <li>
              <Link href="/login" onClick={() => setOpen(false)}>Log in</Link>
            </li>
            <li className="nav-cta">
              <Link className="btn btn-primary" href="/signup" onClick={() => setOpen(false)}>
                Start free &rarr;
              </Link>
            </li>
          </ul>
        </nav>
      </div>
    </header>
  )
}
