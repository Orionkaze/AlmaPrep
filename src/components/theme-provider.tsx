"use client"

import * as React from "react"
import { ThemeProvider as NextThemesProvider } from "next-themes"

if (typeof window !== "undefined" && process.env.NODE_ENV === "development") {
  const orig = console.error
  console.error = (...args: unknown[]) => {
    const first = args[0]
    if (
      typeof first === "string" &&
      (first.includes("Encountered a script tag") ||
        first.includes("Monaco initialization") ||
        first.includes("Failed to fetch"))
    ) {
      return
    }
    if (first instanceof Error && first.message.includes("Failed to fetch")) {
      return
    }
    orig.apply(console, args)
  }
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
