# Mock Mate - Unified Developer Specification

This document combines the Product Requirements (PRD) and Design Document to provide a streamlined guide for building the Mock Mate MVP.

## 1. Product Overview
**Mock Mate** is an AI-powered mock interview platform for students and early professionals. Users practice interviews with an AI interviewer (Gemini) and receive structured feedback.

## 2. Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **Styling:** Tailwind CSS, shadcn/ui
- **Database:** Supabase PostgreSQL
- **Authentication:** Supabase Auth (or Clerk)
- **AI Integration:** Gemini API
- **Hosting:** Vercel

## 3. Core Features (MVP)
1. **Authentication:** Secure sign-up/login.
2. **Onboarding:** Set username and upload/choose an avatar.
3. **Dashboard:** Welcome section, past interview sessions, performance overview, and a "Start Mock Interview" button.
4. **Mock Interview Session:** Chat interface with the AI interviewer. AI asks relevant questions, maintains flow, and asks follow-ups.
   - **Categories:** HR, Technical, Mixed.
5. **AI Feedback:** After the interview, AI generates a score (e.g., 82/100), feedback on clarity/confidence/structure, and improvement suggestions.
6. **Interview History:** View past sessions with dates, categories, scores, and feedback.

## 4. Design & Aesthetics (Ethereal Intelligence)
The design should feel like a high-end, futuristic mentorship experience.

### Theme & Colors
- **Mode:** "Deep Space" Dark Mode
- **Backgrounds:** `#0A0A0B` (absolute), `#121214` (elevated surfaces)
- **Primary Action Color:** Vibrant Purple (`#A855F7`)
- **Secondary Action Color:** Electric Blue (`#3B82F6`)
- **Highlights:** Neon Cyan (`#22D3EE`) for status/live indicators.
- **Gradients:** Use accent gradients for active states and AI "thinking".

### Typography
- **Font:** Geist
- **Style:** Clean, modern SaaS look. Large contrast between display headers (tight letter spacing) and body text (generous letter spacing).

### UI Elements (Glassmorphism)
- **Glass Cards:** Semi-transparent `#121214` (80% opacity), 12px-20px backdrop blur, 1px white border (10% to 2% gradient opacity), inner glow on top/left, 24px padding, `2xl` (1.5rem) rounded corners.
- **Buttons:** 
  - *Primary:* Solid purple-to-blue gradient, 8px rounded corners. Hover state has outer "neon" bloom and 2px upward lift.
  - *Secondary:* Glass background with 1px border.
- **Inputs:** Dark, recessed background (`#050505`), 1px border that glows electric blue on focus, monospaced placeholder font.
- **Interactive Feedback:** AI "thinking" state with shimmering gradient borders. Soft green/amber glows for feedback highlights.

## 5. Development Workflow
1. Initialize the Next.js project.
2. Setup the "Ethereal Intelligence" design system (Tailwind + CSS variables).
3. Setup Supabase database schema and authentication.
4. Build the core pages: `/login`, `/onboarding`, `/dashboard`.
5. Implement the Gemini AI chat interface (`/interview/[id]`).
6. Implement the Feedback generation and History pages.
