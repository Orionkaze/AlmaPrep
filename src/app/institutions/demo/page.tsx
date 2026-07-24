"use client"

import { useState } from "react"
import Link from "next/link"

type Cohort = { name: string; students: number; avg: number; status: "ready" | "ontrack" | "risk" }
type Student = { name: string; score: number; trend: "up" | "down"; why: string; cohort: string; sessions: number; last: string }

const COHORTS: Cohort[] = [
  { name: "Class 12-A", students: 112, avg: 81, status: "ready" },
  { name: "Class 12-B", students: 98, avg: 74, status: "ontrack" },
  { name: "Medical aspirants", students: 64, avg: 69, status: "risk" },
  { name: "Engineering track", students: 42, avg: 83, status: "ready" },
  { name: "Scholarship panel", students: 24, avg: 71, status: "ontrack" },
]

const AT_RISK: Student[] = [
  { name: "Adit Rao", score: 51, trend: "down", why: "Missed last 3 mocks", cohort: "Medical aspirants", sessions: 4, last: "9 days ago" },
  { name: "Sana Khan", score: 58, trend: "down", why: "Low speaking clarity", cohort: "Class 12-B", sessions: 7, last: "4 days ago" },
  { name: "Ved Menon", score: 55, trend: "down", why: "Freezes on curveballs", cohort: "Medical aspirants", sessions: 5, last: "6 days ago" },
  { name: "Ira Bose", score: 60, trend: "down", why: "Weak on 'why this course'", cohort: "Class 12-A", sessions: 9, last: "2 days ago" },
]

const WEEKLY = [22, 31, 28, 44, 39, 52, 61] // interviews completed / day

const STATUS_LABEL: Record<Cohort["status"], string> = { ready: "On track", ontrack: "Progressing", risk: "Needs support" }

export default function InstitutionDemoPage() {
  const [selected, setSelected] = useState<Student | null>(null)
  const maxWeekly = Math.max(...WEEKLY)

  return (
    <div className="almaprep-theme">
      <div className="demo-banner">
        <strong>Interactive demo</strong> — sample data for a fictional school.{" "}
        <Link href="/institutions#demo">Book a walkthrough with your own students →</Link>
      </div>

      <div className="demo-shell">
        <div className="demo-topbar">
          <div className="demo-org">
            <div className="logo">R</div>
            <div>
              <h1>Riverside Public School</h1>
              <p>Admissions readiness · Autumn cohort</p>
            </div>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/institutions" className="btn btn-ghost">← Back to institutions</Link>
            <Link href="/institutions#demo" className="btn btn-primary">Book a real demo</Link>
          </div>
        </div>

        {/* KPIs */}
        <div className="demo-kpis">
          <div className="demo-kpi">
            <div className="label">Active students</div>
            <div className="val">340</div>
            <div className="delta up">+18 this week</div>
          </div>
          <div className="demo-kpi">
            <div className="label">Average score</div>
            <div className="val">78%</div>
            <div className="delta up">▲ 6% vs last month</div>
          </div>
          <div className="demo-kpi">
            <div className="label">Interview-ready</div>
            <div className="val">61%</div>
            <div className="delta up">▲ 9 students</div>
          </div>
          <div className="demo-kpi">
            <div className="label">Need support</div>
            <div className="val">12</div>
            <div className="delta down">flagged automatically</div>
          </div>
        </div>

        <div className="demo-cols">
          {/* Left: cohorts */}
          <div style={{ display: "grid", gap: "var(--s-5)" }}>
            <div className="demo-panel">
              <div className="demo-panel-head">
                <h3>Cohorts</h3>
                <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>{COHORTS.length} groups · sorted by readiness</span>
              </div>
              {COHORTS.map((c) => (
                <div className="cohort-row" key={c.name}>
                  <div>
                    <div className="cname">{c.name}</div>
                    <div className="cmeta">{c.students} students</div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--ink)", minWidth: 40 }}>{c.avg}%</div>
                  <div className="bar"><span style={{ width: `${c.avg}%` }} /></div>
                  <span className={`status-pill ${c.status}`}>{STATUS_LABEL[c.status]}</span>
                </div>
              ))}
            </div>

            <div className="demo-panel">
              <div className="demo-panel-head">
                <h3>Interviews completed this week</h3>
                <span style={{ color: "var(--emerald-600)", fontSize: ".82rem", fontWeight: 600 }}>277 total · ▲ 23%</span>
              </div>
              <div style={{ padding: "var(--s-5)" }}>
                <div className="spark">
                  {WEEKLY.map((v, i) => (
                    <span key={i} className={v === maxWeekly ? "hot" : ""} style={{ height: `${(v / maxWeekly) * 100}%` }} title={`${v} interviews`} />
                  ))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--muted)", fontSize: ".72rem", marginTop: 8 }}>
                  <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right: at-risk */}
          <div className="demo-panel">
            <div className="demo-panel-head">
              <h3>Students to check on</h3>
              <span style={{ color: "var(--muted)", fontSize: ".82rem" }}>auto-flagged</span>
            </div>
            {AT_RISK.map((s) => (
              <div className="risk-row" key={s.name} onClick={() => setSelected(selected?.name === s.name ? null : s)}>
                <div className="avatar">{s.name.split(" ").map((p) => p[0]).join("")}</div>
                <div>
                  <div className="rname">{s.name}</div>
                  <div className="rwhy">{s.why}</div>
                </div>
                <div className="rscore">{s.score}%<i className="fa-solid fa-arrow-trend-down" style={{ marginLeft: 6, fontSize: ".8em" }} /></div>
              </div>
            ))}

            {selected && (
              <div className="student-drawer">
                <h4>{selected.name}</h4>
                <p style={{ color: "var(--muted)", fontSize: ".85rem", margin: "0 0 12px" }}>{selected.cohort} · last active {selected.last}</p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                  <div><div style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Avg score</div><div style={{ fontFamily: "var(--font-head), serif", fontSize: "1.5rem", color: "var(--ink)" }}>{selected.score}%</div></div>
                  <div><div style={{ fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".08em", color: "var(--muted)", fontWeight: 700 }}>Mocks taken</div><div style={{ fontFamily: "var(--font-head), serif", fontSize: "1.5rem", color: "var(--ink)" }}>{selected.sessions}</div></div>
                </div>
                <p style={{ fontSize: ".86rem", margin: "12px 0 14px" }}>Counselor note: <strong>{selected.why.toLowerCase()}</strong> — assign a targeted practice set and a 1:1 check-in.</p>
                <button className="btn btn-primary" style={{ width: "100%", justifyContent: "center" }} onClick={() => setSelected(null)}>Assign practice set</button>
                <p style={{ color: "var(--muted)", fontSize: ".74rem", textAlign: "center", marginTop: 8, marginBottom: 0 }}>Demo action — not saved</p>
              </div>
            )}
          </div>
        </div>

        <p style={{ textAlign: "center", color: "var(--muted)", fontSize: ".85rem", marginTop: "var(--s-7)" }}>
          This is a sample of the counselor view. In your rollout it fills with your own students, cohorts, and branding.{" "}
          <Link href="/institutions#demo">Book a demo</Link> to see it with your data.
        </p>
      </div>
    </div>
  )
}
