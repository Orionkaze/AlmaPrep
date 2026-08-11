"use server";

import { createClient } from "@/lib/supabase/server";
import { getRequestUserId } from "@/lib/getRequestUserId";

export type EarnedBadge = { slug: string; name: string; icon: string; rarity: string; description: string };

// Returns the current user's earned badges (with display info) so the client can
// diff against what it has already shown and toast the new ones. Demo mode returns
// demo badges so popups can be evaluated.
export async function getEarnedBadges(): Promise<EarnedBadge[]> {
  try {
    const userId = await getRequestUserId();
    if (!userId) return [];
    if (userId === "demo-user-id") {
      return [
        {
          slug: "first-step",
          name: "First Step",
          icon: "Rocket",
          rarity: "common",
          description: "Complete your first mock interview",
        },
        {
          slug: "profile-pro",
          name: "Profile Pro",
          icon: "UserCheck",
          rarity: "common",
          description: "Complete your profile 100%",
        },
      ];
    }
    const supabase = await createClient();
    const { data } = (await supabase
      .from("user_badges")
      .select("badge_slug, badges(name, icon, rarity, description)")
      .eq("user_id", userId)) as unknown as {
      data: { badge_slug: string; badges: { name: string; icon: string; rarity: string; description: string } | null }[] | null;
    };
    return (data || [])
      .filter((r) => r.badges)
      .map((r) => ({
        slug: r.badge_slug,
        name: r.badges!.name,
        icon: r.badges!.icon,
        rarity: r.badges!.rarity,
        description: r.badges!.description
      }));
  } catch (e) {
    console.error("getEarnedBadges error:", e);
    return [];
  }
}
