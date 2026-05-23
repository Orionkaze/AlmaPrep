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
);

