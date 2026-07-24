"use client"

import { useEffect } from "react"

// Guarantees the FontAwesome webfonts actually load. With CSS-only FontAwesome
// in a hydrated React app, the ::before private-use glyphs sometimes never
// trigger the browser's font load, so every fa-* icon (all the badges) renders
// blank. Explicitly kicking off the load on mount forces them to paint.
// Version-agnostic: matches any "…Awesome…" family so it survives FA upgrades.
export default function FontAwesomeLoader() {
  useEffect(() => {
    const loadFontAwesome = () => {
      document.fonts.forEach((face) => {
        if (face.family.toLowerCase().includes("awesome") && face.status === "unloaded") {
          face.load().catch(() => {
            // some compat @font-face entries point at files we don't ship — ignore
          })
        }
      })
    }
    loadFontAwesome()
    // Re-run once the font set settles, in case faces registered after mount.
    document.fonts.ready.then(loadFontAwesome).catch(() => {})
  }, [])

  return null
}
