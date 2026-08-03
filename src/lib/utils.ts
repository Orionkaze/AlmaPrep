import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Narrow an unknown thrown value to a message without reaching for `any`.
 * Inlined in ~25 catch blocks before this existed.
 */
export function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}
