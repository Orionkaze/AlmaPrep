import { defineConfig } from "vitest/config"
import { fileURLToPath } from "node:url"

// Minimal vitest setup for the smoke tests. Node environment (these cover
// server-side logic), with the same "@/..." → src alias the app uses.
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
})
