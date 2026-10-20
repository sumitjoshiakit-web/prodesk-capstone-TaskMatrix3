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
  project_id uuid,
  assigned_to_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Ensure columns and workflow stages exist before policies reference them.
alter table public.tasks add column if not exists project_id uuid;
alter table public.tasks add column if not exists assigned_to_email text;
alter table public.tasks drop constraint if exists tasks_status_check;
alter table public.tasks add constraint tasks_status_check check (status in ('backlog', 'todo', 'in_progress', 'review', 'done'));

create index if not exists tasks_user_created_idx on public.tasks (user_id, created_at desc);
create index if not exists tasks_user_status_idx on public.tasks (user_id, status);
alter table public.tasks enable row level security;

drop policy if exists "Users can view own tasks" on public.tasks;
drop policy if exists "Owners and assignees can view tasks" on public.tasks;
create policy "Owners and assignees can view tasks" on public.tasks for select to authenticated using (auth.uid() = user_id or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(assigned_to_email, '')));

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks" on public.tasks
  for insert to authenticated
  with check (
    auth.uid() = user_id
    and (project_id is null or exists (
      select 1 from public.projects p
      where p.id = project_id and p.owner_id = auth.uid()
    ))
  );

drop policy if exists "Users can update own tasks" on public.tasks;
drop policy if exists "Owners and assignees can update tasks" on public.tasks;
create policy "Owners and assignees can update tasks" on public.tasks
  for update to authenticated
  using (
    auth.uid() = user_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(assigned_to_email, ''))
  )
  with check (
    auth.uid() = user_id
    or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(assigned_to_email, ''))
  );

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

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  description text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists projects_owner_created_idx on public.projects(owner_id, created_at desc);
update public.tasks t set project_id = null where t.project_id is not null and not exists (select 1 from public.projects p where p.id = t.project_id);
alter table public.tasks drop constraint if exists tasks_project_id_fkey;
alter table public.tasks add constraint tasks_project_id_fkey foreign key (project_id) references public.projects(id) on delete set null;

-- Keep task ownership and project boundaries safe in the database, not only in the UI.
create or replace function public.enforce_task_write_rules()
returns trigger
language plpgsql
security invoker
set search_path = public
as $
declare
  current_email text := lower(coalesce(auth.jwt() ->> 'email', ''));
  is_owner boolean;
begin
  if new.project_id is not null then
    select exists (
      select 1 from public.projects p
      where p.id = new.project_id and p.owner_id = new.user_id
    ) into is_owner;
    if not is_owner then
      raise exception 'Tasks can only be linked to a project owned by the task owner.';
    end if;
  end if;

  if tg_op = 'UPDATE' and auth.uid() <> old.user_id then
    if current_email = '' or current_email <> lower(coalesce(old.assigned_to_email, '')) then
      raise exception 'Only the task owner or assigned user can update this task.';
    end if;
    if new.user_id is distinct from old.user_id
      or new.title is distinct from old.title
      or new.description is distinct from old.description
      or new.priority is distinct from old.priority
      or new.due_date is distinct from old.due_date
      or new.project_id is distinct from old.project_id
      or new.assigned_to_email is distinct from old.assigned_to_email
      or new.created_at is distinct from old.created_at then
      raise exception 'Assigned users may update task status only.';
    end if;
  end if;
  return new;
end;
$;

drop trigger if exists enforce_task_write_rules on public.tasks;
create trigger enforce_task_write_rules
before insert or update on public.tasks
for each row execute function public.enforce_task_write_rules();
alter table public.projects enable row level security;
drop policy if exists "Owners manage own projects" on public.projects;
create policy "Owners manage own projects" on public.projects
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
grant select, insert, update, delete on public.projects to authenticated;

-- Project membership is email-based for this student MVP; only project owners
-- can manage the member list. Task visibility is granted to owners and explicit assignees.
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
drop policy if exists "Task participants read comments" on public.task_comments;
drop policy if exists "Signed-in participants add comments" on public.task_comments;
create policy "Task participants read comments" on public.task_comments
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(t.assigned_to_email, '')))));
create policy "Signed-in participants add comments" on public.task_comments
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(t.assigned_to_email, '')))));
grant select, insert on public.task_comments to authenticated;

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
drop policy if exists "Task participants read activity" on public.task_activity;
drop policy if exists "Signed-in participants add activity" on public.task_activity;
create policy "Task participants read activity" on public.task_activity
  for select to authenticated
  using (exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(t.assigned_to_email, '')))));
create policy "Signed-in participants add activity" on public.task_activity
  for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.tasks t where t.id = task_id and (t.user_id = auth.uid() or lower(coalesce(auth.jwt() ->> 'email', '')) = lower(coalesce(t.assigned_to_email, '')))));
grant select, insert on public.task_activity to authenticated;
