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

-- Etiquetas: cada sección tiene las suyas y el nombre no se repite (sin distinguir mayúsculas).
create table if not exists public.labels (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  space text not null default 'personal' check (space in ('personal', 'work')),
  name text not null,
  color text not null default 'gray',
  created_at timestamptz not null default now()
);

create unique index if not exists labels_user_space_name_idx on public.labels (user_id, space, lower(name));

alter table public.labels enable row level security;

drop policy if exists "labels_select_own" on public.labels;
create policy "labels_select_own" on public.labels
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "labels_insert_own" on public.labels;
create policy "labels_insert_own" on public.labels
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "labels_update_own" on public.labels;
create policy "labels_update_own" on public.labels
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "labels_delete_own" on public.labels;
create policy "labels_delete_own" on public.labels
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Qué etiquetas lleva cada tarea. Borrar la tarea o la etiqueta quita la relación.
create table if not exists public.task_labels (
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  task_id uuid not null references public.tasks (id) on delete cascade,
  label_id uuid not null references public.labels (id) on delete cascade,
  primary key (task_id, label_id)
);

create index if not exists task_labels_label_id_idx on public.task_labels (label_id);

alter table public.task_labels enable row level security;

drop policy if exists "task_labels_select_own" on public.task_labels;
create policy "task_labels_select_own" on public.task_labels
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "task_labels_insert_own" on public.task_labels;
create policy "task_labels_insert_own" on public.task_labels
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists "task_labels_delete_own" on public.task_labels;
create policy "task_labels_delete_own" on public.task_labels
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Cuándo se completó cada tarea (para la vista Completadas y las estadísticas).
-- Las completadas antes de existir esta columna se quedan sin fecha.
alter table public.tasks add column if not exists completed_at timestamptz;

-- Si una tarea muestra sus subtareas completadas (por defecto se ocultan; se elige en cada tarea).
-- Sustituye a hide_done_subtasks, que ya no se usa.
alter table public.tasks add column if not exists show_done_subtasks boolean not null default false;

-- Si una tarea tiene sus subtareas plegadas en la lista (se elige en cada tarea).
alter table public.tasks add column if not exists collapsed boolean not null default false;

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
-- Cuando una lista con el nombre por defecto («Mi lista», «Mi lista 2»…) pasa a
-- tener más de una persona, se llama «Compartida» (o «Compartida 2», «Compartida 3»…
-- si alguno de sus miembros ya tiene una lista con ese nombre).
create or replace function public.join_household(invite_code text, member_name text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := (select auth.uid());
  h uuid;
  n int := 1;
  candidate text;
begin
  if uid is null then raise exception 'not_authenticated'; end if;
  select household_id into h from public.household_invites
  where code = upper(trim(invite_code)) and expires_at > now();
  if h is null then raise exception 'invalid_invite'; end if;
  insert into public.household_members (household_id, user_id, display_name)
  values (h, uid, trim(member_name))
  on conflict (household_id, user_id) do nothing;

  if (select count(*) from public.household_members where household_id = h) > 1
     and (select name from public.households where id = h) ~ '^Mi lista( [0-9]+)?$' then
    loop
      candidate := case when n = 1 then 'Compartida' else 'Compartida ' || n end;
      exit when not exists (
        select 1 from public.households x
        join public.household_members m on m.household_id = x.id
        where x.id <> h and x.name = candidate
          and m.user_id in (select user_id from public.household_members where household_id = h)
      );
      n := n + 1;
    end loop;
    update public.households set name = candidate where id = h;
  end if;
  return h;
end;
$$;

-- Sale de una lista. Si no queda nadie, la lista y sus artículos se borran.
create or replace function public.leave_household(h uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.household_members where household_id = h and user_id = (select auth.uid());
  if not exists (select 1 from public.household_members where household_id = h) then
    delete from public.households where id = h;
  end if;
end;
$$;

-- Como mucho 3 listas por persona, para que la pantalla no se desborde y evitar abusos.
-- Se comprueba al entrar en una lista (crearla o unirse); si ya se era miembro, no cuenta.
create or replace function public.check_household_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (
    select 1 from public.household_members
    where household_id = new.household_id and user_id = new.user_id
  ) then
    return new;
  end if;
  if (select count(*) from public.household_members where user_id = new.user_id) >= 3 then
    raise exception 'list_limit';
  end if;
  return new;
end;
$$;

drop trigger if exists household_members_limit on public.household_members;
create trigger household_members_limit
  before insert on public.household_members
  for each row execute function public.check_household_limit();

-- Las listas nuevas se llaman «Mi lista» si no se dice otra cosa.
alter table public.households alter column name set default 'Mi lista';

-- Solo con sesión iniciada.
revoke execute on function public.create_household(text, text) from public, anon;
revoke execute on function public.create_household_invite(uuid) from public, anon;
revoke execute on function public.household_invite_info(text) from public, anon;
revoke execute on function public.join_household(text, text) from public, anon;
revoke execute on function public.leave_household(uuid) from public, anon;
grant execute on function public.create_household(text, text) to authenticated;
grant execute on function public.create_household_invite(uuid) to authenticated;
grant execute on function public.household_invite_info(text) to authenticated;
grant execute on function public.join_household(text, text) to authenticated;
grant execute on function public.leave_household(uuid) to authenticated;

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

-- ─────────────────────────────────────────────────────────────────────────────
-- Calendarios de Google (solo lectura).
--
-- doneT es una web estática: el intercambio de códigos y la renovación de los
-- permisos de Google se hacen aquí, en la base de datos, con la extensión http.
-- El secreto del cliente OAuth y los tokens de cada cuenta nunca llegan al
-- navegador: solo un token de acceso de una hora para leer los calendarios.
--
-- Configuración (una vez), en el SQL Editor, con los datos del cliente OAuth:
--   select vault.create_secret('<ID de cliente>', 'google_client_id');
--   select vault.create_secret('<secreto de cliente>', 'google_client_secret');
-- ─────────────────────────────────────────────────────────────────────────────

create extension if not exists http with schema extensions;

-- Cuentas de Google conectadas. needs_reauth: Google ha retirado el permiso y
-- hay que volver a conectarla.
create table if not exists public.google_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  email text not null,
  needs_reauth boolean not null default false,
  created_at timestamptz not null default now(),
  unique (user_id, email)
);

alter table public.google_accounts enable row level security;

drop policy if exists "google_accounts_select_own" on public.google_accounts;
create policy "google_accounts_select_own" on public.google_accounts
  for select to authenticated using ((select auth.uid()) = user_id);

-- Las cuentas se crean y se quitan con google_connect y google_disconnect.

-- Tokens de cada cuenta: sin políticas, así que solo los leen las funciones de abajo.
create table if not exists public.google_tokens (
  account_id uuid primary key references public.google_accounts (id) on delete cascade,
  refresh_token text not null,
  access_token text,
  expires_at timestamptz
);

alter table public.google_tokens enable row level security;
revoke all on public.google_tokens from anon, authenticated;

-- Calendarios de cada cuenta y en qué secciones se ven sus eventos (vacío = en ninguna).
create table if not exists public.google_calendars (
  account_id uuid not null references public.google_accounts (id) on delete cascade,
  calendar_id text not null,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  color text not null default '#8b919c',
  spaces text[] not null default '{}',
  primary key (account_id, calendar_id)
);

create index if not exists google_calendars_user_id_idx on public.google_calendars (user_id);

alter table public.google_calendars enable row level security;

drop policy if exists "google_calendars_select_own" on public.google_calendars;
create policy "google_calendars_select_own" on public.google_calendars
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists "google_calendars_insert_own" on public.google_calendars;
create policy "google_calendars_insert_own" on public.google_calendars
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.google_accounts a where a.id = account_id and a.user_id = (select auth.uid()))
  );

drop policy if exists "google_calendars_update_own" on public.google_calendars;
create policy "google_calendars_update_own" on public.google_calendars
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy if exists "google_calendars_delete_own" on public.google_calendars;
create policy "google_calendars_delete_own" on public.google_calendars
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Un secreto guardado en Vault (o null si no está).
create or replace function public.google_secret(secret_name text)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select decrypted_secret from vault.decrypted_secrets where name = secret_name limit 1;
$$;

revoke execute on function public.google_secret(text) from public, anon, authenticated;

-- El ID de cliente es público (va en la dirección de Google); null = sin configurar.
create or replace function public.google_client_id()
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select public.google_secret('google_client_id');
$$;

-- Cambia el código que devuelve Google al conectar una cuenta por sus tokens y
-- guarda la cuenta. Devuelve su id.
create or replace function public.google_connect(code text, redirect_uri text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  uid uuid := auth.uid();
  cid text := public.google_secret('google_client_id');
  csecret text := public.google_secret('google_client_secret');
  res extensions.http_response;
  tok jsonb;
  info jsonb;
  acc uuid;
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;
  if cid is null or csecret is null then
    raise exception 'google_not_configured';
  end if;

  res := extensions.http_post(
    'https://oauth2.googleapis.com/token',
    'grant_type=authorization_code'
      || '&code=' || extensions.urlencode(code)
      || '&client_id=' || extensions.urlencode(cid)
      || '&client_secret=' || extensions.urlencode(csecret)
      || '&redirect_uri=' || extensions.urlencode(redirect_uri),
    'application/x-www-form-urlencoded'
  );
  if res.status <> 200 then
    raise exception 'google_token_error: %', res.content;
  end if;
  tok := res.content::jsonb;

  -- Google deja desmarcar permisos al aceptar: sin el de calendarios no sirve de nada.
  if position('calendar' in coalesce(tok ->> 'scope', '')) = 0 then
    raise exception 'google_missing_scope';
  end if;

  -- La cuenta (su email) sale del id_token que acompaña a los tokens.
  res := extensions.http_get(
    'https://oauth2.googleapis.com/tokeninfo?id_token=' || extensions.urlencode(tok ->> 'id_token')
  );
  if res.status <> 200 then
    raise exception 'google_tokeninfo_error: %', res.content;
  end if;
  info := res.content::jsonb;

  insert into public.google_accounts (user_id, email, needs_reauth)
  values (uid, info ->> 'email', false)
  on conflict (user_id, email) do update set needs_reauth = false
  returning id into acc;

  if tok ->> 'refresh_token' is null
     and not exists (select 1 from public.google_tokens where account_id = acc) then
    raise exception 'google_no_refresh_token';
  end if;

  insert into public.google_tokens (account_id, refresh_token, access_token, expires_at)
  values (
    acc,
    tok ->> 'refresh_token',
    tok ->> 'access_token',
    now() + make_interval(secs => (tok ->> 'expires_in')::int)
  )
  on conflict (account_id) do update set
    refresh_token = coalesce(excluded.refresh_token, public.google_tokens.refresh_token),
    access_token = excluded.access_token,
    expires_at = excluded.expires_at;

  return acc;
end;
$$;

-- Token de acceso (válido como mucho una hora) para leer los calendarios de una
-- cuenta desde el navegador. Lo renueva si va a caducar. Si Google ya no da
-- permiso, marca la cuenta y devuelve {"error": "reauth"}.
create or replace function public.google_access_token(account uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  tk public.google_tokens;
  res extensions.http_response;
  tok jsonb;
  new_expires timestamptz;
begin
  select t.* into tk
  from public.google_tokens t
  join public.google_accounts a on a.id = t.account_id
  where t.account_id = google_access_token.account and a.user_id = (select auth.uid());
  if not found then
    raise exception 'google_account_not_found';
  end if;

  if tk.access_token is not null and tk.expires_at > now() + interval '2 minutes' then
    return jsonb_build_object('access_token', tk.access_token, 'expires_at', tk.expires_at);
  end if;

  res := extensions.http_post(
    'https://oauth2.googleapis.com/token',
    'grant_type=refresh_token'
      || '&refresh_token=' || extensions.urlencode(tk.refresh_token)
      || '&client_id=' || extensions.urlencode(public.google_secret('google_client_id'))
      || '&client_secret=' || extensions.urlencode(public.google_secret('google_client_secret')),
    'application/x-www-form-urlencoded'
  );
  if res.status in (400, 401) then
    update public.google_accounts set needs_reauth = true where id = tk.account_id;
    return jsonb_build_object('error', 'reauth');
  end if;
  if res.status <> 200 then
    raise exception 'google_token_error: %', res.content;
  end if;
  tok := res.content::jsonb;
  new_expires := now() + make_interval(secs => (tok ->> 'expires_in')::int);

  update public.google_tokens set
    access_token = tok ->> 'access_token',
    expires_at = new_expires,
    refresh_token = coalesce(tok ->> 'refresh_token', refresh_token)
  where account_id = tk.account_id;
  update public.google_accounts set needs_reauth = false where id = tk.account_id and needs_reauth;

  return jsonb_build_object('access_token', tok ->> 'access_token', 'expires_at', new_expires);
end;
$$;

-- Quita una cuenta: retira el permiso en Google (si se puede) y borra la cuenta,
-- sus tokens y sus calendarios.
create or replace function public.google_disconnect(account uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  rt text;
begin
  select t.refresh_token into rt
  from public.google_tokens t
  join public.google_accounts a on a.id = t.account_id
  where t.account_id = google_disconnect.account and a.user_id = (select auth.uid());

  if rt is not null then
    begin
      perform extensions.http_post(
        'https://oauth2.googleapis.com/revoke',
        'token=' || extensions.urlencode(rt),
        'application/x-www-form-urlencoded'
      );
    exception when others then
      null; -- Si Google no responde, la cuenta se borra igual.
    end;
  end if;

  delete from public.google_accounts where id = google_disconnect.account and user_id = (select auth.uid());
end;
$$;

revoke execute on function public.google_client_id() from public, anon;
revoke execute on function public.google_connect(text, text) from public, anon;
revoke execute on function public.google_access_token(uuid) from public, anon;
revoke execute on function public.google_disconnect(uuid) from public, anon;
grant execute on function public.google_client_id() to authenticated;
grant execute on function public.google_connect(text, text) to authenticated;
grant execute on function public.google_access_token(uuid) to authenticated;
grant execute on function public.google_disconnect(uuid) to authenticated;
