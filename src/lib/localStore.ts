"use client"

import { createClient } from "@/lib/supabase/client"

/**
 * User-scoped browser storage.
 *
 * Every localStorage key in this app used to be global to the browser:
 * `almaprep_seen_badges`, `mockmate-scheduled-sessions`, and — when a session
 * row could not be created — `feedback-technical` / `proctoring-hr`, keyed by
 * interview *category*. Almaprep is sold to schools, where a browser is a
 * shared lab machine, so the next student to sit down inherited the previous
 * one's schedule, badge state, and full interview report.
 *
 * Everything written through here is namespaced with the signed-in user's id
 * and can be wiped in one call on logout or account deletion. Values written
 * while signed out land under an "anon" namespace and are cleared the same way.
 */

const PREFIX = "almaprep"

let cachedScope: string | null = null

/** Resolve (and memoise) the namespace for the current browser session. */
async function scope(): Promise<string> {
  if (cachedScope) return cachedScope
  try {
    const supabase = createClient()
    const { data } = await supabase.auth.getUser()
    cachedScope = data.user?.id ?? "anon"
  } catch {
    cachedScope = "anon"
  }
  return cachedScope
}

/** Call when the signed-in user changes, so the next read re-resolves. */
export function resetScope(): void {
  cachedScope = null
}

async function scopedKey(key: string): Promise<string> {
  return `${PREFIX}:${await scope()}:${key}`
}

export async function getStored<T>(key: string): Promise<T | null> {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(await scopedKey(key))
    return raw === null ? null : (JSON.parse(raw) as T)
  } catch {
    return null
  }
}

export async function setStored(key: string, value: unknown): Promise<void> {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(await scopedKey(key), JSON.stringify(value))
  } catch (err) {
    // Quota exceeded, or storage disabled in a locked-down school profile.
    console.warn(`[localStore] could not persist ${key}:`, err)
  }
}

export async function removeStored(key: string): Promise<void> {
  if (typeof window === "undefined") return
  try {
    localStorage.removeItem(await scopedKey(key))
  } catch {
    // ignore
  }
}

/**
 * Remove every key this app has written, for every namespace — including the
 * legacy unprefixed keys from before scoping existed, which are exactly the
 * ones that leaked between students.
 */
export function clearAllAppStorage(): void {
  if (typeof window === "undefined") return
  const legacy = (key: string) =>
    key.startsWith("feedback-") ||
    key.startsWith("behavioral-") ||
    key.startsWith("proctoring-") ||
    key.startsWith("mockmate-") ||
    key === "mockmate_users" ||
    key === "almaprep_seen_badges"

  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const key = localStorage.key(i)
      if (!key) continue
      if (key.startsWith(`${PREFIX}:`) || legacy(key)) {
        localStorage.removeItem(key)
      }
    }
  } catch (err) {
    console.warn("[localStore] could not clear storage:", err)
  }
  resetScope()
}
