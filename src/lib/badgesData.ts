export const DEFAULT_BADGES = [
  // Getting Started
  { slug: 'first-step', name: 'First Step', description: 'Complete your first mock interview', category: 'getting_started', icon: 'fa-solid fa-shoe-prints', rarity: 'common' },
  { slug: 'code-debut', name: 'Code Debut', description: 'Complete your first coding challenge', category: 'getting_started', icon: 'fa-solid fa-code', rarity: 'common' },
  { slug: 'profile-pro', name: 'Profile Pro', description: 'Complete your profile 100%', category: 'getting_started', icon: 'fa-solid fa-user-check', rarity: 'common' },
  { slug: 'resume-ready', name: 'Resume Ready', description: 'Upload and analyze your first resume', category: 'getting_started', icon: 'fa-solid fa-file-lines', rarity: 'common' },
  { slug: 'github-connected', name: 'GitHub Connected', description: 'Connect your GitHub account', category: 'getting_started', icon: 'fa-brands fa-github', rarity: 'common' },
  { slug: 'early-bird', name: 'Early Bird', description: 'Log in 3 days in a row within your first week', category: 'getting_started', icon: 'fa-solid fa-sun', rarity: 'common' },

  // Streak
  { slug: 'on-a-roll', name: 'On A Roll', description: '3-day streak', category: 'streak', icon: 'fa-solid fa-fire', rarity: 'common' },
  { slug: 'week-warrior', name: 'Week Warrior', description: '7-day streak', category: 'streak', icon: 'fa-solid fa-fire-flame-simple', rarity: 'common' },
  { slug: 'fortnight-fighter', name: 'Fortnight Fighter', description: '14-day streak', category: 'streak', icon: 'fa-solid fa-fire-flame-curved', rarity: 'rare' },
  { slug: 'monthly-grinder', name: 'Monthly Grinder', description: '30-day streak', category: 'streak', icon: 'fa-solid fa-meteor', rarity: 'rare' },
  { slug: 'unstoppable', name: 'Unstoppable', description: '60-day streak', category: 'streak', icon: 'fa-solid fa-infinity', rarity: 'legendary' },
  { slug: 'century-club', name: 'Century Club', description: '100-day streak', category: 'streak', icon: 'fa-solid fa-crown', rarity: 'legendary' },
  { slug: 'legend', name: 'Legend', description: '365-day streak', category: 'streak', icon: 'fa-solid fa-star', rarity: 'legendary' },

  // Interview
  { slug: 'nervous-no-more', name: 'Nervous No More', description: 'Complete 5 interviews', category: 'interview', icon: 'fa-solid fa-microphone', rarity: 'common' },
  { slug: 'interview-veteran', name: 'Interview Veteran', description: 'Complete 25 interviews', category: 'interview', icon: 'fa-solid fa-medal', rarity: 'common' },
  { slug: 'interview-machine', name: 'Interview Machine', description: 'Complete 50 interviews', category: 'interview', icon: 'fa-solid fa-robot', rarity: 'rare' },
  { slug: 'century-interviewer', name: 'Century Interviewer', description: 'Complete 100 interviews', category: 'interview', icon: 'fa-solid fa-trophy', rarity: 'legendary' },
  { slug: 'domain-hopper', name: 'Domain Hopper', description: 'Complete interviews in 5 domains', category: 'interview', icon: 'fa-solid fa-compass', rarity: 'common' },
  { slug: 'domain-master', name: 'Domain Master', description: 'Complete interviews in 15 domains', category: 'interview', icon: 'fa-solid fa-map', rarity: 'rare' },
  { slug: 'domain-legend', name: 'Domain Legend', description: 'Complete interviews in all 20+ domains', category: 'interview', icon: 'fa-solid fa-earth-americas', rarity: 'legendary' },
  { slug: 'perfect-score', name: 'Perfect Score', description: 'Score 100% in any interview', category: 'interview', icon: 'fa-solid fa-circle-check', rarity: 'rare' },
  { slug: 'speed-talker', name: 'Speed Talker', description: 'Complete an interview with 0 filler words', category: 'interview', icon: 'fa-solid fa-person-running', rarity: 'rare' },
  { slug: 'consistent-performer', name: 'Consistent Performer', description: 'Score above 80% in 10 consecutive interviews', category: 'interview', icon: 'fa-solid fa-chart-line', rarity: 'rare' },

  // Coding
  { slug: 'bug-slayer', name: 'Bug Slayer', description: 'Pass all test cases on first attempt', category: 'coding', icon: 'fa-solid fa-bug-slash', rarity: 'common' },
  { slug: 'optimizer', name: 'Optimizer', description: 'Get 10/10 code quality score', category: 'coding', icon: 'fa-solid fa-gauge-high', rarity: 'rare' },
  { slug: 'polyglot', name: 'Polyglot', description: 'Solve in both JS and Python', category: 'coding', icon: 'fa-solid fa-language', rarity: 'rare' },
  { slug: 'github-publisher', name: 'GitHub Publisher', description: 'Push first solution to GitHub', category: 'coding', icon: 'fa-brands fa-github', rarity: 'common' },
  { slug: 'problem-solver', name: 'Problem Solver', description: 'Complete 10 coding challenges', category: 'coding', icon: 'fa-solid fa-puzzle-piece', rarity: 'common' },
  { slug: 'code-veteran', name: 'Code Veteran', description: 'Complete 25 coding challenges', category: 'coding', icon: 'fa-solid fa-laptop-code', rarity: 'common' },
  { slug: 'code-machine', name: 'Code Machine', description: 'Complete 50 coding challenges', category: 'coding', icon: 'fa-solid fa-server', rarity: 'rare' },
  { slug: 'first-try', name: 'First Try', description: 'Solve 5 challenges on first attempt', category: 'coding', icon: 'fa-solid fa-bullseye', rarity: 'rare' },
  { slug: 'speed-coder', name: 'Speed Coder', description: 'Complete a challenge in under 5 minutes', category: 'coding', icon: 'fa-solid fa-stopwatch', rarity: 'rare' },
  { slug: 'repo-builder', name: 'Repo Builder', description: 'Push 5 solutions to GitHub', category: 'coding', icon: 'fa-solid fa-code-branch', rarity: 'rare' },

  // Skill
  { slug: 'body-language-boss', name: 'Body Language Boss', description: 'Score 90%+ on body language 3 times', category: 'skill', icon: 'fa-solid fa-person', rarity: 'rare' },
  { slug: 'silver-tongue', name: 'Silver Tongue', description: 'Score 90%+ on speaking analysis 3 times', category: 'skill', icon: 'fa-solid fa-comments', rarity: 'rare' },
  { slug: 'star-student', name: 'STAR Student', description: 'Use STAR method perfectly in 5 answers', category: 'skill', icon: 'fa-solid fa-star-half-stroke', rarity: 'rare' },
  { slug: 'github-guru', name: 'GitHub Guru', description: 'Complete a GitHub Mode interview', category: 'skill', icon: 'fa-brands fa-github', rarity: 'rare' },
  { slug: 'proctoring-pro', name: 'Proctoring Pro', description: 'Complete an interview with 0 violations', category: 'skill', icon: 'fa-solid fa-shield-halved', rarity: 'rare' },
  { slug: 'filler-free', name: 'Filler Free', description: 'Under 3 filler words in 3 interviews', category: 'skill', icon: 'fa-solid fa-volume-xmark', rarity: 'rare' },
  { slug: 'posture-perfect', name: 'Posture Perfect', description: 'Score 100% posture in any interview', category: 'skill', icon: 'fa-solid fa-child-reaching', rarity: 'rare' },
  { slug: 'eye-contact-king', name: 'Eye Contact King', description: 'Score 95%+ eye contact in 3 interviews', category: 'skill', icon: 'fa-solid fa-eye', rarity: 'rare' },

  // Progress
  { slug: 'glow-up', name: 'Glow Up', description: 'Improve average score by 20% over 5 sessions', category: 'progress', icon: 'fa-solid fa-arrow-trend-up', rarity: 'rare' },
  { slug: 'comeback-kid', name: 'Comeback Kid', description: 'Score 90%+ after previously scoring below 50%', category: 'progress', icon: 'fa-solid fa-rotate-left', rarity: 'rare' },
  { slug: 'steady-climber', name: 'Steady Climber', description: 'Improve score in 5 consecutive interviews', category: 'progress', icon: 'fa-solid fa-stairs', rarity: 'common' },
  { slug: 'weak-spot-warrior', name: 'Weak Spot Warrior', description: 'Complete 3 interviews in your lowest scoring domain', category: 'progress', icon: 'fa-solid fa-dumbbell', rarity: 'rare' },
  { slug: 'all-rounder', name: 'All Rounder', description: 'Score 70%+ in Technical, HR and Mixed', category: 'progress', icon: 'fa-solid fa-circle-half-stroke', rarity: 'rare' },
  { slug: 'overachiever', name: 'Overachiever', description: 'Complete 3+ activities in a single day', category: 'progress', icon: 'fa-solid fa-bolt', rarity: 'common' },
  { slug: 'weekend-warrior', name: 'Weekend Warrior', description: 'Complete interviews on both Saturday and Sunday', category: 'progress', icon: 'fa-solid fa-calendar-week', rarity: 'common' },

  // Special & Rare
  { slug: 'night-owl', name: 'Night Owl', description: 'Complete an interview between midnight and 5am', category: 'special', icon: 'fa-solid fa-moon', rarity: 'legendary' },
  { slug: 'early-riser', name: 'Early Riser', description: 'Complete an interview between 5am and 7am', category: 'special', icon: 'fa-solid fa-cloud-sun', rarity: 'rare' },
  { slug: 'lunch-break-hustler', name: 'Lunch Break Hustler', description: 'Complete an interview between 12pm and 1pm', category: 'special', icon: 'fa-solid fa-utensils', rarity: 'common' },
  { slug: 'marathon-session', name: 'Marathon Session', description: 'Complete 3 interviews in a single day', category: 'special', icon: 'fa-solid fa-flag-checkered', rarity: 'rare' },
  { slug: 'ghost-mode', name: 'Ghost Mode', description: '0 violations AND 0 filler words in one interview', category: 'special', icon: 'fa-solid fa-ghost', rarity: 'legendary' },
  { slug: 'triple-threat', name: 'Triple Threat', description: 'Complete interview + coding + resume analysis in one day', category: 'special', icon: 'fa-solid fa-triangle-exclamation', rarity: 'legendary' },
  { slug: 'almaprep-og', name: 'AlmaPrep OG', description: 'Among first 1000 users to sign up', category: 'special', icon: 'fa-solid fa-certificate', rarity: 'legendary' }
];
