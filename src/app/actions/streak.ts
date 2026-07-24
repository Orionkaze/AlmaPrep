"use server";

import { createClient } from "@/lib/supabase/server";

/**
 * Updates the user's streak based on calendar day difference.
 * 
 * @param userId - the user's ID
 * @param localDateString - the local date string (YYYY-MM-DD) from the client where the activity occurred
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

    // Log the activity regardless of streak changes
    const { error: logError } = await supabase
      .from("activity_log")
      .insert({
        user_id: userId,
        activity_type: activityType,
        activity_id: activityId,
        activity_date: localDateString // store exact local date
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
    const today = new Date(localDateString);
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
    if (updated || last_activity_date !== localDateString) {
      const { error: updateError } = await supabase
        .from("users")
        .update({
          current_streak: newCurrentStreak,
          longest_streak: newLongestStreak,
          last_activity_date: localDateString
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
