import { createClient } from "@/lib/supabase/server";

/**
 * Streak accounting.
 *
 * SERVER-INTERNAL ON PURPOSE. This takes a userId argument, which is safe only
 * because it is never a server action — it used to live in a "use server" file,
 * which made it a public RPC endpoint that any visitor could call with someone
 * else's id and any date they liked. Call it from a route/action that has
 * already resolved the user.
 */

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Clamp the client-reported local date to something a real timezone could
 * produce.
 *
 * The client sends its own calendar date (via the `x-local-date` header) so a
 * user in UTC+13 gets credit on their own Tuesday, not ours. But the value is
 * fully attacker-controlled: replaying the call with 2026-01-01, 2026-01-02,
 * 2026-01-03… walks `current_streak` up one per request, since the logic below
 * only compares consecutive days.
 *
 * Real offsets span UTC-12 to UTC+14, so a legitimate local date is always
 * within one day of the server's UTC date. Anything else falls back to UTC.
 */
export function normalizeLocalDate(input: string | null | undefined, now: number): string {
  const utcToday = new Date(now).toISOString().slice(0, 10);
  if (!input || !DATE_RE.test(input)) return utcToday;

  const parsed = Date.parse(`${input}T00:00:00Z`);
  if (Number.isNaN(parsed)) return utcToday;

  const utcMidnight = Date.parse(`${utcToday}T00:00:00Z`);
  const dayDelta = Math.round((parsed - utcMidnight) / 86_400_000);
  return Math.abs(dayDelta) <= 1 ? input : utcToday;
}

/**
 * Updates the user's streak based on calendar day difference.
 *
 * @param userId - the user's ID, already resolved from the session by the caller
 * @param localDateString - the local date string (YYYY-MM-DD) reported by the
 *   client; clamped to ±1 day of the server's UTC date before it is trusted
 * @param activityType - 'interview' or 'coding_challenge'
 * @param activityId - the ID of the completed session
 */
export async function updateStreak(
  userId: string,
  localDateString: string,
  activityType: string,
  activityId: string
) {
  try {
    const supabase = await createClient();
    const activityDate = normalizeLocalDate(localDateString, Date.now());

    // Log the activity regardless of streak changes
    const { error: logError } = await supabase
      .from("activity_log")
      .insert({
        user_id: userId,
        activity_type: activityType,
        activity_id: activityId,
        activity_date: activityDate // store exact local date
      });

    if (logError) {
      console.error("Failed to log activity:", logError);
    }

    // Fetch current streak stats
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("current_streak, longest_streak, last_activity_date")
      .eq("id", userId)
      .single();

    if (userError || !user) {
      console.error("Failed to fetch user for streak update:", userError);
      return { success: false, error: "User not found" };
    }

    const { current_streak, longest_streak, last_activity_date } = user;

    let newCurrentStreak = current_streak || 0;
    let newLongestStreak = longest_streak || 0;
    let updated = false;

    // Use local client dates to determine day boundaries
    const today = new Date(activityDate);
    today.setHours(0, 0, 0, 0);

    if (last_activity_date) {
      const lastActivity = new Date(last_activity_date);
      lastActivity.setHours(0, 0, 0, 0);

      // Calculate difference in days
      const diffTime = today.getTime() - lastActivity.getTime();
      const diffDays = Math.round(diffTime / (1000 * 3600 * 24));

      if (diffDays === 1) {
        // Activity yesterday -> increment streak
        newCurrentStreak += 1;
        updated = true;
      } else if (diffDays > 1) {
        // Activity 2+ days ago -> reset streak
        newCurrentStreak = 1;
        updated = true;
      } else if (diffDays === 0) {
        // Activity today -> streak maintained, no increment needed
        // but we still want to ensure last_activity_date is explicitly set below if it wasn't
      }
    } else {
      // First activity ever
      newCurrentStreak = 1;
      updated = true;
    }

    // Update longest streak if necessary
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
      updated = true;
    }

    // Update user record if streak logic changed OR if we just need to set today's date for the first time
    if (updated || last_activity_date !== activityDate) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_activity_date: activityDate
        })
        .eq("id", userId);

      if (updateError) {
        console.error("Failed to update user streak:", updateError);
        return { success: false, error: updateError.message };
      }
    }

    return {
      success: true,
      current_streak: newCurrentStreak,
      longest_streak: newLongestStreak
    };
  } catch (err) {
    console.error("updateStreak error:", err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}
