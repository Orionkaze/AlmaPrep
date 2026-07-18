/**
 * Hand-rolled validation for the contact-sales form.
 *
 * The return shape deliberately mirrors zod's `safeParse` ({ ok, data } |
 * { ok, fieldErrors }). If a second or third form ever needs validation, add
 * zod and swap the body of validateContactLead — no call site changes. For one
 * six-field form it is not worth a dependency.
 */

export const STUDENT_RANGES = [
  "Under 100",
  "100–500",
  "500–2,000",
  "2,000+",
] as const

export type ContactLead = {
  name: string
  email: string
  institution: string
  role: string
  students: string
  message: string
  plan: string
  source: string
}

type Ok = { ok: true; data: ContactLead }
type Err = { ok: false; fieldErrors: Record<string, string> }

function str(fd: FormData, key: string): string {
  const v = fd.get(key)
  return typeof v === "string" ? v.trim() : ""
}

// Conservative single-@ email check. Server-side backstop to the HTML type.
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function validateContactLead(fd: FormData): Ok | Err {
  const fieldErrors: Record<string, string> = {}

  const name = str(fd, "name")
  const email = str(fd, "email")
  const institution = str(fd, "institution")
  const role = str(fd, "role")
  const students = str(fd, "students")
  const message = str(fd, "message")
  const plan = str(fd, "plan")
  const source = str(fd, "source")

  if (name.length < 2 || name.length > 120) {
    fieldErrors.name = "Please enter your name."
  }
  if (!email || email.length > 254 || !EMAIL_RE.test(email)) {
    fieldErrors.email = "Please enter a valid email address."
  }
  if (institution.length < 2 || institution.length > 200) {
    fieldErrors.institution = "Please enter your institution."
  }
  if (role.length > 120) {
    fieldErrors.role = "That role name is too long."
  }
  if (students && !STUDENT_RANGES.includes(students as (typeof STUDENT_RANGES)[number])) {
    fieldErrors.students = "Please choose one of the listed ranges."
  }
  if (message.length > 4000) {
    fieldErrors.message = "Please keep your message under 4000 characters."
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors }
  }

  return {
    ok: true,
    data: { name, email, institution, role, students, message, plan, source },
  }
}
