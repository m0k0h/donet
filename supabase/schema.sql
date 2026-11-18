-- Esquema de doneT. Ejecutar una vez en Supabase: SQL Editor → New query → Run.

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  space text not null default 'personal' check (space in ('personal', 'work')),
  title text not null,
  done boolean not null default false,
  priority smallint not null default 4 check (priority between 1 and 4),
  due date,
  created_at timestamptz not null default now()
);

create index if not exists tasks_user_id_idx on public.tasks (user_id);

-- Cada persona solo ve y modifica sus propias tareas.
alter table public.tasks enable row level security;

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own" on public.tasks
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own" on public.tasks
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own" on public.tasks
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own" on public.tasks
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Proyectos: cada uno pertenece a una sección y puede estar dentro de otro proyecto.
-- Borrar un proyecto borra sus subproyectos y sus tareas.
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  space text not null default 'personal' check (space in ('personal', 'work')),
  parent_id uuid references public.projects (id) on delete cascade,
  name text not null,
  color text not null default 'gray',
  created_at timestamptz not null default now()
);

create index if not exists projects_user_id_idx on public.projects (user_id);

alter table public.projects enable row level security;

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own" on public.projects
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own" on public.projects
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own" on public.projects
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own" on public.projects
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Tareas: proyecto (sin proyecto = Entrada), tarea madre (subtareas) y descripción.
alter table public.tasks add column if not exists project_id uuid references public.projects (id) on delete cascade;
alter table public.tasks add column if not exists parent_id uuid references public.tasks (id) on delete cascade;
alter table public.tasks add column if not exists description text;

create index if not exists tasks_project_id_idx on public.tasks (project_id);
create index if not exists tasks_parent_id_idx on public.tasks (parent_id);

-- Hora de la tarea (opcional, solo tiene sentido con fecha).
alter table public.tasks add column if not exists due_time time;

-- Comentarios de las tareas. Borrar una tarea borra sus comentarios.
create table if not exists public.task_comments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);

create index if not exists task_comments_task_id_idx on public.task_comments (task_id);

alter table public.task_comments enable row level security;

drop policy if exists "task_comments_select_own" on public.task_comments;
create policy "task_comments_select_own" on public.task_comments
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "task_comments_insert_own" on public.task_comments;
create policy "task_comments_insert_own" on public.task_comments
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "task_comments_delete_own" on public.task_comments;
create policy "task_comments_delete_own" on public.task_comments
  for delete to authenticated using ((select auth.uid()) = user_id);
