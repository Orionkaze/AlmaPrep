"use server";

import { createClient } from "@/lib/supabase/server";
import { getRequestUserId } from "@/lib/getRequestUserId";

export type EarnedBadge = { slug: string; name: string; icon: string; rarity: string };

// Returns the current user's earned badges (with display info) so the client can
// diff against what it has already shown and toast the new ones. Demo mode has no
// real user_badges rows, so it returns [] (no notifications there).
//
// This is the only badge function that is a server action, i.e. a public
// endpoint. It takes no arguments and resolves the user from the session — the
// award engine (lib/badges.ts) deliberately stays server-internal because it
// takes a userId.
export async function getEarnedBadges(): Promise<EarnedBadge[]> {
  try {
    const userId = await getRequestUserId();
    if (!userId || userId === "demo-user-id") return [];
    const supabase = await createClient();
    const { data } = (await supabase
      .from("user_badges")
      .select("badge_slug, badges(name, icon, rarity)")
      .eq("user_id", userId)) as unknown as {
      data: { badge_slug: string; badges: { name: string; icon: string; rarity: string } | null }[] | null;
    };
    return (data || [])
      .filter((r) => r.badges)
      .map((r) => ({ slug: r.badge_slug, name: r.badges!.name, icon: r.badges!.icon, rarity: r.badges!.rarity }));
  } catch (e) {
    console.error("getEarnedBadges error:", e);
    return [];
  }
}
