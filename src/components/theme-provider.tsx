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
        first.includes("Failed to fetch") ||
        first.includes("[object Event]"))
    ) {
      return
    }
    if (first instanceof Error && (first.message.includes("Failed to fetch") || first.message.includes("[object Event]"))) {
      return
    }
    if (first && typeof first === "object" && first.toString() === "[object Event]") {
      return
    }
    orig.apply(console, args)
  }

  window.addEventListener("unhandledrejection", (event) => {
    if (
      event.reason instanceof Event ||
      (event.reason && typeof event.reason === "object" && event.reason.toString() === "[object Event]") ||
      (typeof event.reason === "string" && (event.reason.includes("Failed to fetch") || event.reason.includes("[object Event]")))
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  })

  window.addEventListener("error", (event) => {
    if (
      event.error instanceof Event ||
      (event.message && (event.message.includes("[object Event]") || event.message.includes("Failed to fetch")))
    ) {
      event.preventDefault()
      event.stopImmediatePropagation()
    }
  })
}

export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>
}
