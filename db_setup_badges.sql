-- Add streak tracking to users table
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS last_activity_date date;

-- Activity log table for streak tracking
CREATE TABLE IF NOT EXISTS public.activity_log (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  activity_type text NOT NULL, -- 'interview' | 'coding_challenge'
  activity_id uuid NOT NULL,
  activity_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own activity" ON public.activity_log;
CREATE POLICY "Users can view their own activity" ON public.activity_log FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own activity" ON public.activity_log;
CREATE POLICY "Users can insert their own activity" ON public.activity_log FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Badges table
CREATE TABLE IF NOT EXISTS public.badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text NOT NULL,
  category text NOT NULL, -- 'getting_started' | 'streak' | 'interview' | 'coding' | 'skill' | 'progress' | 'special'
  icon text NOT NULL, -- Font Awesome class
  rarity text NOT NULL DEFAULT 'common', -- 'common' | 'rare' | 'legendary'
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- User Badges table
CREATE TABLE IF NOT EXISTS public.user_badges (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  badge_slug text REFERENCES public.badges(slug) NOT NULL,
  earned_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, badge_slug)
);

ALTER TABLE public.user_badges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view their own badges" ON public.user_badges;
CREATE POLICY "Users can view their own badges" ON public.user_badges FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users can insert their own badges" ON public.user_badges;
CREATE POLICY "Users can insert their own badges" ON public.user_badges FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Seed Badges (ON CONFLICT DO NOTHING)
INSERT INTO public.badges (slug, name, description, category, icon, rarity) VALUES
-- Getting Started
('first-step', 'First Step', 'Complete your first mock interview', 'getting_started', 'fa-solid fa-shoe-prints', 'common'),
('code-debut', 'Code Debut', 'Complete your first coding challenge', 'getting_started', 'fa-solid fa-code', 'common'),
('profile-pro', 'Profile Pro', 'Complete your profile 100%', 'getting_started', 'fa-solid fa-user-check', 'common'),
('resume-ready', 'Resume Ready', 'Upload and analyze your first resume', 'getting_started', 'fa-solid fa-file-lines', 'common'),
('github-connected', 'GitHub Connected', 'Connect your GitHub account', 'getting_started', 'fa-brands fa-github', 'common'),
('early-bird', 'Early Bird', 'Log in 3 days in a row within your first week', 'getting_started', 'fa-solid fa-sun', 'common'),

-- Streak
('on-a-roll', 'On A Roll', '3-day streak', 'streak', 'fa-solid fa-fire', 'common'),
('week-warrior', 'Week Warrior', '7-day streak', 'streak', 'fa-solid fa-fire-flame-simple', 'common'),
('fortnight-fighter', 'Fortnight Fighter', '14-day streak', 'streak', 'fa-solid fa-fire-flame-curved', 'rare'),
('monthly-grinder', 'Monthly Grinder', '30-day streak', 'streak', 'fa-solid fa-meteor', 'rare'),
('unstoppable', 'Unstoppable', '60-day streak', 'streak', 'fa-solid fa-infinity', 'legendary'),
('century-club', 'Century Club', '100-day streak', 'streak', 'fa-solid fa-crown', 'legendary'),
('legend', 'Legend', '365-day streak', 'streak', 'fa-solid fa-star', 'legendary'),

-- Interview
('nervous-no-more', 'Nervous No More', 'Complete 5 interviews', 'interview', 'fa-solid fa-microphone', 'common'),
('interview-veteran', 'Interview Veteran', 'Complete 25 interviews', 'interview', 'fa-solid fa-medal', 'common'),
('interview-machine', 'Interview Machine', 'Complete 50 interviews', 'interview', 'fa-solid fa-robot', 'rare'),
('century-interviewer', 'Century Interviewer', 'Complete 100 interviews', 'interview', 'fa-solid fa-trophy', 'legendary'),
('domain-hopper', 'Domain Hopper', 'Complete interviews in 5 domains', 'interview', 'fa-solid fa-compass', 'common'),
('domain-master', 'Domain Master', 'Complete interviews in 15 domains', 'interview', 'fa-solid fa-map', 'rare'),
('domain-legend', 'Domain Legend', 'Complete interviews in all 20+ domains', 'interview', 'fa-solid fa-earth-americas', 'legendary'),
('perfect-score', 'Perfect Score', 'Score 100% in any interview', 'interview', 'fa-solid fa-circle-check', 'rare'),
('speed-talker', 'Speed Talker', 'Complete an interview with 0 filler words', 'interview', 'fa-solid fa-person-running', 'rare'),
('consistent-performer', 'Consistent Performer', 'Score above 80% in 10 consecutive interviews', 'interview', 'fa-solid fa-chart-line', 'rare'),

-- Coding
('bug-slayer', 'Bug Slayer', 'Pass all test cases on first attempt', 'coding', 'fa-solid fa-bug-slash', 'common'),
('optimizer', 'Optimizer', 'Get 10/10 code quality score', 'coding', 'fa-solid fa-gauge-high', 'rare'),
('polyglot', 'Polyglot', 'Solve in both JS and Python', 'coding', 'fa-solid fa-language', 'rare'),
('github-publisher', 'GitHub Publisher', 'Push first solution to GitHub', 'coding', 'fa-brands fa-github', 'common'),
('problem-solver', 'Problem Solver', 'Complete 10 coding challenges', 'coding', 'fa-solid fa-puzzle-piece', 'common'),
('code-veteran', 'Code Veteran', 'Complete 25 coding challenges', 'coding', 'fa-solid fa-laptop-code', 'common'),
('code-machine', 'Code Machine', 'Complete 50 coding challenges', 'coding', 'fa-solid fa-server', 'rare'),
('first-try', 'First Try', 'Solve 5 challenges on first attempt', 'coding', 'fa-solid fa-bullseye', 'rare'),
('speed-coder', 'Speed Coder', 'Complete a challenge in under 5 minutes', 'coding', 'fa-solid fa-stopwatch', 'rare'),
('repo-builder', 'Repo Builder', 'Push 5 solutions to GitHub', 'coding', 'fa-solid fa-code-branch', 'rare'),

-- Skill
('body-language-boss', 'Body Language Boss', 'Score 90%+ on body language 3 times', 'skill', 'fa-solid fa-person', 'rare'),
('silver-tongue', 'Silver Tongue', 'Score 90%+ on speaking analysis 3 times', 'skill', 'fa-solid fa-comments', 'rare'),
('star-student', 'STAR Student', 'Use STAR method perfectly in 5 answers', 'skill', 'fa-solid fa-star-half-stroke', 'rare'),
('github-guru', 'GitHub Guru', 'Complete a GitHub Mode interview', 'skill', 'fa-brands fa-github', 'rare'),
('proctoring-pro', 'Proctoring Pro', 'Complete an interview with 0 violations', 'skill', 'fa-solid fa-shield-halved', 'rare'),
('filler-free', 'Filler Free', 'Under 3 filler words in 3 interviews', 'skill', 'fa-solid fa-volume-xmark', 'rare'),
('posture-perfect', 'Posture Perfect', 'Score 100% posture in any interview', 'skill', 'fa-solid fa-child-reaching', 'rare'),
('eye-contact-king', 'Eye Contact King', 'Score 95%+ eye contact in 3 interviews', 'skill', 'fa-solid fa-eye', 'rare'),

-- Progress
('glow-up', 'Glow Up', 'Improve average score by 20% over 5 sessions', 'progress', 'fa-solid fa-arrow-trend-up', 'rare'),
('comeback-kid', 'Comeback Kid', 'Score 90%+ after previously scoring below 50%', 'progress', 'fa-solid fa-rotate-left', 'rare'),
('steady-climber', 'Steady Climber', 'Improve score in 5 consecutive interviews', 'progress', 'fa-solid fa-stairs', 'common'),
('weak-spot-warrior', 'Weak Spot Warrior', 'Complete 3 interviews in your lowest scoring domain', 'progress', 'fa-solid fa-dumbbell', 'rare'),
('all-rounder', 'All Rounder', 'Score 70%+ in Technical, HR and Mixed', 'progress', 'fa-solid fa-circle-half-stroke', 'rare'),
('overachiever', 'Overachiever', 'Complete 3+ activities in a single day', 'progress', 'fa-solid fa-bolt', 'common'),
('weekend-warrior', 'Weekend Warrior', 'Complete interviews on both Saturday and Sunday', 'progress', 'fa-solid fa-calendar-week', 'common'),

-- Special & Rare
('night-owl', 'Night Owl', 'Complete an interview between midnight and 5am', 'special', 'fa-solid fa-moon', 'legendary'),
('early-riser', 'Early Riser', 'Complete an interview between 5am and 7am', 'special', 'fa-solid fa-cloud-sun', 'rare'),
('lunch-break-hustler', 'Lunch Break Hustler', 'Complete an interview between 12pm and 1pm', 'special', 'fa-solid fa-utensils', 'common'),
('marathon-session', 'Marathon Session', 'Complete 3 interviews in a single day', 'special', 'fa-solid fa-flag-checkered', 'rare'),
('ghost-mode', 'Ghost Mode', '0 violations AND 0 filler words in one interview', 'special', 'fa-solid fa-ghost', 'legendary'),
('triple-threat', 'Triple Threat', 'Complete interview + coding + resume analysis in one day', 'special', 'fa-solid fa-triangle-exclamation', 'legendary'),
('almaprep-og', 'AlmaPrep OG', 'Among first 1000 users to sign up', 'special', 'fa-solid fa-certificate', 'legendary')

ON CONFLICT (slug) DO NOTHING;
