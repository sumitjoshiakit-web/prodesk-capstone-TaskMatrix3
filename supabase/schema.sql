-- Run this entire file in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 120),
  description text check (description is null or char_length(description) <= 1000),
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'Medium' check (priority in ('Low', 'Medium', 'High')),
  due_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_user_created_idx on public.tasks (user_id, created_at desc);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
alter table public.tasks enable row level security;

drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Owners and assignees can view tasks" on public.tasks;
create policy "Owners and assignees can view tasks" on public.tasks for select to authenticated using (auth.uid() = user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(assigned_to_email, '')));

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks" on public.tasks for insert to authenticated with check (auth.uid() = user_id);

drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Owners and assignees can update tasks" on public.tasks;
create policy "Owners and assignees can update tasks" on public.tasks for update to authenticated using (auth.uid() = user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(assigned_to_email, ''))) with check (auth.uid() = user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(assigned_to_email, '')));

drop policy if exists "Users can delete own tasks" on public.tasks;
create policy "Users can delete own tasks" on public.tasks for delete to authenticated using (auth.uid() = user_id);

create or replace function public.set_task_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at before update on public.tasks
for each row execute function public.set_task_updated_at();

grant select, insert, update, delete on public.tasks to authenticated;

-- Sprint 15 PRD expansion: projects, five-stage workflow, team assignment,
-- task comments, and an audit-friendly activity feed.
alter table public.tasks add column if not exists project_id uuid;
alter table public.tasks add column if not exists assigned_to_email text;
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check
  check (status in ('backlog', 'todo', 'in_progress', 'review', 'done'));

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists projects_owner_created_idx on public.projects(owner_id, created_at desc);
alter table public.projects enable row level security;
drop policy if exists "Owners manage own projects" on public.projects;
create policy "Owners manage own projects" on public.projects
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant select, insert, update, delete on public.projects to authenticated;

-- Project membership is email-based for this student MVP; only project owners
-- can manage the member list. Assignments do not grant access to private tasks.
create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  owner_id uuid not null references auth.users(id) on delete cascade,
  member_email text not null check (position('@' in member_email) > 1),
  created_at timestamptz not null default now(),
  unique(project_id, member_email)
);
alter table public.project_members enable row level security;
drop policy if exists "Owners manage project members" on public.project_members;
create policy "Owners manage project members" on public.project_members
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant select, insert, update, delete on public.project_members to authenticated;

create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists task_comments_task_created_idx on public.task_comments(task_id, created_at);
alter table public.task_comments enable row level security;
drop policy if exists "Task owners manage comments" on public.task_comments;
create policy "Task owners manage comments" on public.task_comments
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(t.assigned_to_email, '')))))
  with check (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(t.assigned_to_email, '')))));
grant select, insert, update, delete on public.task_comments to authenticated;

create table if not exists public.task_activity (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references public.tasks(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  action text not null check (char_length(action) <= 200),
  created_at timestamptz not null default now()
);
create index if not exists task_activity_task_created_idx on public.task_activity(task_id, created_at desc);
alter table public.task_activity enable row level security;
drop policy if exists "Task owners manage activity" on public.task_activity;
create policy "Task owners manage activity" on public.task_activity
  for all to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(t.assigned_to_email, '')))))
  with check (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(t.assigned_to_email, '')))));
grant select, insert, update, delete on public.task_activity to authenticated;
