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

-- ─── Compra compartida ──────────────────────────────────────────────────────
-- Un hogar agrupa a varias personas que comparten la lista de la compra.
-- Crear un hogar y unirse a uno se hace con funciones (más abajo), no con
-- inserts directos, para que nadie pueda meterse en un hogar ajeno.

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.household_members (
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default now(),
  primary key (household_id, user_id)
);

create index if not exists household_members_user_id_idx on public.household_members (user_id);

-- Invitaciones: un código que caduca a los 7 días y se comparte como enlace.
create table if not exists public.household_invites (
  code text primary key,
  household_id uuid not null references public.households (id) on delete cascade,
  created_by uuid not null default auth.uid() references auth.users (id) on delete cascade,
  expires_at timestamptz not null default now() + interval '7 days'
);

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null,
  quantity text,
  note text,
  checked boolean not null default false,
  added_by uuid default auth.uid() references auth.users (id) on delete set null,
  checked_by uuid references auth.users (id) on delete set null,
  checked_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists shopping_items_household_id_idx on public.shopping_items (household_id);

-- ¿La persona conectada pertenece al hogar? Con security definer para que las
-- reglas de household_members no se llamen a sí mismas.
create or replace function public.is_household_member(h uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.household_members m
    where m.household_id = h and m.user_id = (select auth.uid())
  );
$$;

alter table public.households enable row level security;
alter table public.household_members enable row level security;
alter table public.household_invites enable row level security;
alter table public.shopping_items enable row level security;

-- Hogares: los ven y renombran sus miembros.
drop policy if exists "households_select_member" on public.households;
create policy "households_select_member" on public.households
  for select to authenticated using (public.is_household_member(id));

drop policy if exists "households_update_member" on public.households;
create policy "households_update_member" on public.households
  for update to authenticated
  using (public.is_household_member(id))
  with check (public.is_household_member(id));

-- Miembros: cada uno ve a los de sus hogares, cambia su nombre y puede salir.
drop policy if exists "household_members_select" on public.household_members;
create policy "household_members_select" on public.household_members
  for select to authenticated using (public.is_household_member(household_id));

drop policy if exists "household_members_update_self" on public.household_members;
create policy "household_members_update_self" on public.household_members
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "household_members_delete_self" on public.household_members;
create policy "household_members_delete_self" on public.household_members
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Invitaciones: solo las ven los miembros (para unirse se usa una función).
drop policy if exists "household_invites_select_member" on public.household_invites;
create policy "household_invites_select_member" on public.household_invites
  for select to authenticated using (public.is_household_member(household_id));

-- Artículos: todo el hogar los ve y los cambia.
drop policy if exists "shopping_items_select_member" on public.shopping_items;
create policy "shopping_items_select_member" on public.shopping_items
  for select to authenticated using (public.is_household_member(household_id));

drop policy if exists "shopping_items_insert_member" on public.shopping_items;
create policy "shopping_items_insert_member" on public.shopping_items
  for insert to authenticated with check (public.is_household_member(household_id));

drop policy if exists "shopping_items_update_member" on public.shopping_items;
create policy "shopping_items_update_member" on public.shopping_items
  for update to authenticated
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

drop policy if exists "shopping_items_delete_member" on public.shopping_items;
create policy "shopping_items_delete_member" on public.shopping_items
  for delete to authenticated using (public.is_household_member(household_id));

-- Crea un hogar y mete dentro a quien lo crea.
create or replace function public.create_household(household_name text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  h uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  insert into public.households (name, created_by) values (trim(household_name), uid) returning id into h;
  insert into public.household_members (household_id, user_id, display_name) values (h, uid, trim(member_name));
  return h;
end;
$$;

-- Genera un código de invitación para un hogar del que se es miembro.
create or replace function public.create_household_invite(h uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  c text := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10));
begin
  if not public.is_household_member(h) then raise exception 'not_member'; end if;
  insert into public.household_invites (code, household_id, created_by) values (c, h, (select auth.uid()));
  return c;
end;
$$;

-- Nombre del hogar de una invitación válida, para enseñarlo antes de unirse.
create or replace function public.household_invite_info(invite_code text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select h.name from public.household_invites i
  join public.households h on h.id = i.household_id
  where i.code = upper(trim(invite_code)) and i.expires_at > now();
$$;

-- Se une al hogar de una invitación válida. Si ya era miembro, no cambia nada.
create or replace function public.join_household(invite_code text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  h uuid;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select household_id into h from public.household_invites
  where code = upper(trim(invite_code)) and expires_at > now();
  if h is null then raise exception 'invalid_invite'; end if;
  insert into public.household_members (household_id, user_id, display_name)
  values (h, uid, trim(member_name))
  on conflict (household_id, user_id) do nothing;
  return h;
end;
$$;

-- Solo con sesión iniciada.
revoke execute on function public.create_household(text, text) from public, anon;
revoke execute on function public.create_household_invite(uuid) from public, anon;
revoke execute on function public.household_invite_info(text) from public, anon;
revoke execute on function public.join_household(text, text) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.household_invite_info(text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;

-- Cambios en tiempo real de la lista para todos los miembros.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'shopping_items'
  ) then
    alter publication supabase_realtime add table public.shopping_items;
  end if;
end;
$$;
