create table public.users (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  resume_text text,
  resume_analysis jsonb,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.users enable row level security;
create policy "Users can view their own profile" on public.users for select using (auth.uid() = id);
create policy "Users can insert their own profile" on public.users for insert with check (auth.uid() = id);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

create table public.interviews (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users not null,
  category text not null,
  status text not null,
  use_resume boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.interviews enable row level security;
create policy "Users can view their own interviews" on public.interviews for select using (auth.uid() = user_id);
create policy "Users can insert their own interviews" on public.interviews for insert with check (auth.uid() = user_id);
create policy "Users can update their own interviews" on public.interviews for update using (auth.uid() = user_id);

create table public.messages (
  id uuid default gen_random_uuid() primary key,
  interview_id uuid references public.interviews on delete cascade not null,
  role text not null,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.messages enable row level security;
create policy "Users can view their own messages" on public.messages for select using (
  exists (select 1 from public.interviews where id = public.messages.interview_id and user_id = auth.uid())
);
create policy "Users can insert their own messages" on public.messages for insert with check (
  exists (select 1 from public.interviews where id = public.messages.interview_id and user_id = auth.uid())
);

create table public.feedback (
  id uuid default gen_random_uuid() primary key,
  interview_id uuid references public.interviews on delete cascade not null,
  score integer not null,
  summary text not null,
  improvement_suggestions text[] not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.feedback enable row level security;
create policy "Users can view their own feedback" on public.feedback for select using (
  exists (select 1 from public.interviews where id = public.feedback.interview_id and user_id = auth.uid())
);
create policy "Users can insert their own feedback" on public.feedback for insert with check (
  exists (select 1 from public.interviews where id = public.feedback.interview_id and user_id = auth.uid())

-- Part 3 & 5: Subscription Tier and Rate Limiting
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS subscription_tier text DEFAULT 'free';

CREATE TABLE IF NOT EXISTS public.interview_usage (
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  month text NOT NULL,
  count integer DEFAULT 0 NOT NULL,
  PRIMARY KEY (user_id, month)
);

ALTER TABLE public.interview_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage" ON public.interview_usage
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage" ON public.interview_usage
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own usage" ON public.interview_usage
  FOR UPDATE USING (auth.uid() = user_id);

-- Coding Interview Simulator Tables
create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null,
  challenge_type text not null check (challenge_type in ('bug_fix', 'feature', 'refactor', 'security', 'performance')),
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  starter_code jsonb not null,
  hidden_tests jsonb not null,
  expected_outcomes jsonb not null,
  created_at timestamp default now()
);

create table public.interview_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id),
  challenge_id uuid references public.challenges(id),
  conversation jsonb default '[]',
  current_codebase jsonb,
  submitted_code jsonb,
  status text default 'in_progress' check (status in ('in_progress', 'submitted', 'evaluated')),
  started_at timestamp default now(),
  submitted_at timestamp
);

create table public.interview_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.interview_sessions(id),
  user_id uuid references auth.users(id),
  scores jsonb not null,
  strengths text[],
  weaknesses text[],
  hiring_recommendation text,
  recommendation_reasoning text,
  overall_score integer,
  test_results jsonb,
  generated_at timestamp default now()
);

alter table public.challenges enable row level security;
alter table public.interview_sessions enable row level security;
alter table public.interview_reports enable row level security;

create policy "Allow read access to challenges" on public.challenges
  for select using (true);

create policy "Users can read their own sessions" on public.interview_sessions
  for select using (auth.uid() = user_id);

create policy "Users can insert their own sessions" on public.interview_sessions
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own sessions" on public.interview_sessions
  for update using (auth.uid() = user_id);

create policy "Users can read their own reports" on public.interview_reports
  for select using (auth.uid() = user_id);

create policy "Users can insert their own reports" on public.interview_reports
  for insert with check (auth.uid() = user_id);

-- GitHub Project Analysis Cache Table
create table public.github_analysis (
  user_id uuid references public.users(id) on delete cascade not null primary key,
  profile_summary text not null,
  tech_stack text[] not null,
  strengths text[] not null,
  questions jsonb not null, -- Stores array of questions: {repo, question, difficulty}
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.github_analysis enable row level security;

-- RLS Policies
create policy "Users can view their own github analysis" on public.github_analysis 
  for select using (auth.uid() = user_id);

create policy "Users can insert their own github analysis" on public.github_analysis 
  for insert with check (auth.uid() = user_id);

create policy "Users can update their own github analysis" on public.github_analysis 
  for update using (auth.uid() = user_id);

create policy "Users can delete their own github analysis" on public.github_analysis 
  for delete using (auth.uid() = user_id);

-- Migration: Add metadata column to public.messages to track question sources
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}'::jsonb;

-- Migration: Create behavioral_analysis table for behavioral feedback tracking
create table if not exists public.behavioral_analysis (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  session_id uuid references public.interviews(id) on delete cascade not null,
  answer_scores jsonb not null, -- Array of per-answer quality scores
  physical_metrics jsonb not null, -- Array of 30-second interval physical metrics
  final_report text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.behavioral_analysis enable row level security;

create policy "Users can view their own behavioral analysis" on public.behavioral_analysis
  for select using (auth.uid() = user_id);

create policy "Users can insert their own behavioral analysis" on public.behavioral_analysis
  for insert with check (auth.uid() = user_id);

-- Migration: Add speaking_analysis column to public.behavioral_analysis
alter table public.behavioral_analysis add column if not exists speaking_analysis jsonb;

-- Migration: Add proctoring columns to public.interviews
alter table public.interviews add column if not exists proctoring_log jsonb;
alter table public.interviews add column if not exists is_flagged boolean default false;







