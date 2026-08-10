"use client";

import React, { useState, useEffect } from "react";
import { Bell } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { getStored, setStored } from "@/lib/localStore"
import { SCHEDULE_KEY, type ScheduledSession } from "@/lib/schedule"

/** Scheduled practice sessions, namespaced per user by lib/localStore. */

interface Notification {
  id: string;
  type: "booking" | "badge" | "streak";
  title: string;
  message: string;
  read: boolean;
  created_at: string;
}

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const isDemoMode = document.cookie.includes("mockmate-demo-session");
    const supabase = isDemoMode ? null : createClient();

    const markMissedBookings = async () => {
      // Check local storage for missed bookings
      try {
        const sessions = await getStored<ScheduledSession[]>(SCHEDULE_KEY);
        if (sessions) {
          const now = new Date();
          let hasChanges = false;
          sessions.forEach((s) => {
            if (new Date(s.scheduledFor) < now && !s.missedNotified) {
              s.missedNotified = true;
              hasChanges = true;
               toast(`Booking Reminder: ${s.title}`, {
                description: "You missed a scheduled session! You can still start it now.",
                classNames: {
                  toast: "bg-blue-50 dark:bg-[#1e293b]/90 border border-blue-200 dark:border-blue-800/40 text-blue-950 dark:text-blue-50 rounded-xl p-4 shadow-lg",
                  title: "text-blue-900 dark:text-blue-100 font-bold text-sm",
                  description: "text-blue-700 dark:text-blue-300/90 text-xs mt-1"
                }
              });
            }
          });
          if (hasChanges) {
            await setStored(SCHEDULE_KEY, sessions);
          }
        }
      } catch (err) {
        console.error("Failed to mark missed bookings", err);
      }
    };

    const fetchNotifications = async () => {
      if (isDemoMode) {
        // Mock notifications for demo mode
        const mockNotifs: Notification[] = [
          { id: "1", type: "badge", title: "Badge Earned", message: "You earned the Early Bird badge!", read: false, created_at: new Date().toISOString() },
          { id: "2", type: "streak", title: "Streak Milestone", message: "You hit a 3-day streak!", read: false, created_at: new Date().toISOString() }
        ];
        
        // Only show toasts for unread mock ones on first load
        const shown = sessionStorage.getItem("mock-notifs-shown");
        if (!shown) {
          mockNotifs.forEach(n => {
             if (n.type === "badge") {
              toast(n.title, {
                description: n.message,
                classNames: {
                  toast: "bg-amber-50 dark:bg-[#1e293b]/90 border border-amber-200 dark:border-amber-800/40 text-amber-950 dark:text-amber-50 rounded-xl p-4 shadow-lg",
                  title: "text-amber-900 dark:text-amber-100 font-bold text-sm",
                  description: "text-amber-700 dark:text-amber-300/90 text-xs mt-1"
                }
              });
            } else if (n.type === "streak") {
              toast(n.title, {
                description: n.message,
                classNames: {
                  toast: "bg-orange-50 dark:bg-[#1e293b]/90 border border-orange-200 dark:border-orange-800/40 text-orange-950 dark:text-orange-50 rounded-xl p-4 shadow-lg",
                  title: "text-orange-900 dark:text-orange-100 font-bold text-sm",
                  description: "text-orange-700 dark:text-orange-300/90 text-xs mt-1"
                }
              });
            }
          });
          sessionStorage.setItem("mock-notifs-shown", "true");
        }
        
        setNotifications(mockNotifs);
        setUnreadCount(mockNotifs.length);
        return;
      }

      if (!supabase) return;

      try {
        const { data: user } = await supabase.auth.getUser();
        if (!user.user) return;

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("user_id", user.user.id)
          .order("created_at", { ascending: false });

        if (error) {
          // If the table doesn't exist yet (42P01) or is missing from schema cache, silently ignore to avoid console clutter in dev
          if (error.code !== '42P01' && !error.message?.includes('schema cache')) {
            console.error("Error fetching notifications:", error.message || error);
          }
          return;
        }

        if (data) {
          const currentIds = notifications.map(n => n.id);
          const newNotifs = data.filter((n: Notification) => !currentIds.includes(n.id) && !n.read);
          
          newNotifs.forEach((n: Notification) => {
             if (n.type === "booking") {
              toast(n.title, {
                description: n.message,
                classNames: {
                  toast: "bg-blue-50 dark:bg-[#1e293b]/90 border border-blue-200 dark:border-blue-800/40 text-blue-950 dark:text-blue-50 rounded-xl p-4 shadow-lg",
                  title: "text-blue-900 dark:text-blue-100 font-bold text-sm",
                  description: "text-blue-700 dark:text-blue-300/90 text-xs mt-1"
                }
              });
            } else if (n.type === "badge") {
              toast(n.title, {
                description: n.message,
                classNames: {
                  toast: "bg-amber-50 dark:bg-[#1e293b]/90 border border-amber-200 dark:border-amber-800/40 text-amber-950 dark:text-amber-50 rounded-xl p-4 shadow-lg",
                  title: "text-amber-900 dark:text-amber-100 font-bold text-sm",
                  description: "text-amber-700 dark:text-amber-300/90 text-xs mt-1"
                }
              });
            } else if (n.type === "streak") {
              toast(n.title, {
                description: n.message,
                classNames: {
                  toast: "bg-orange-50 dark:bg-[#1e293b]/90 border border-orange-200 dark:border-orange-800/40 text-orange-950 dark:text-orange-50 rounded-xl p-4 shadow-lg",
                  title: "text-orange-900 dark:text-orange-100 font-bold text-sm",
                  description: "text-orange-700 dark:text-orange-300/90 text-xs mt-1"
                }
              });
            }
          });

          setNotifications(data as Notification[]);
          setUnreadCount(data.filter((n: Notification) => !n.read).length);
        }
      } catch (err) {
        console.error("Error in fetchNotifications", err);
      }
    };

    // Run immediately on mount
    markMissedBookings();
    fetchNotifications();

    // Set up polling interval every 60 seconds
    const interval = setInterval(() => {
      fetchNotifications();
    }, 60000);

    // Cleanup interval on unmount
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button className="relative p-2 rounded-full hover:bg-muted transition-colors cursor-pointer text-muted-foreground hover:text-foreground">
      <Bell size={20} />
      {unreadCount > 0 && (
        <span className="absolute top-1 right-1.5 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
        </span>
      )}
    </button>
  );
}
