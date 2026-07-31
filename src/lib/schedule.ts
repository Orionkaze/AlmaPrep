/**
 * Scheduled practice sessions, as stored in the browser.
 *
 * The key and the record shape were copy-pasted into ScheduleModal, MySchedule
 * and NotificationBell — and the copies had already drifted: the writer and one
 * reader disagreed about which fields were optional. One definition now.
 */
export const SCHEDULE_KEY = "scheduled_sessions"

export type ScheduledSession = {
  id: string
  title: string
  scheduledFor: string
  category?: string
  createdAt?: string
  missedNotified?: boolean
}
