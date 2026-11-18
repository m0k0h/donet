import { createBrowserClient } from "@supabase/ssr";
import type { Comment, Priority, Project, Space, Task } from "./tasks";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// La sesión se guarda en cookies: en local, las cookies de localhost valen para
// todos los puertos, así que una sola sesión sirve para main y cada worktree.
// Sin variables de entorno es null y la app muestra la pantalla de configuración.
export const supabase = url && key ? createBrowserClient(url, key) : null;

type Row = {
  id: string;
  space: Space;
  project_id: string | null;
  parent_id: string | null;
  title: string;
  description: string | null;
  done: boolean;
  priority: Priority;
  due: string | null;
  due_time?: string | null; // "10:00:00"
  created_at: string;
};

// Todas las columnas: así la app sigue cargando aunque falte alguna columna nueva por crear.
const COLUMNS = "*";

const toRow = (t: Task) => ({
  id: t.id,
  space: t.space,
  project_id: t.projectId ?? null,
  parent_id: t.parentId ?? null,
  title: t.title,
  description: t.description ?? null,
  done: t.done,
  priority: t.priority,
  due: t.due ?? null,
  due_time: (t.due && t.dueTime) || null,
  created_at: new Date(t.createdAt).toISOString(),
});

const fromRow = (r: Row): Task => ({
  id: r.id,
  space: r.space,
  projectId: r.project_id ?? undefined,
  parentId: r.parent_id ?? undefined,
  title: r.title,
  description: r.description ?? undefined,
  done: r.done,
  priority: r.priority,
  due: r.due ?? undefined,
  dueTime: (r.due && r.due_time?.slice(0, 5)) || undefined,
  createdAt: Date.parse(r.created_at),
});

export async function fetchTasks(): Promise<Task[]> {
  const { data, error } = await supabase!.from("tasks").select(COLUMNS).order("created_at");
  if (error) throw error;
  return (data as Row[]).map(fromRow);
}

// Inserta las tareas que aún no existan (sirve también para subir las locales).
export async function insertTasks(tasks: Task[]) {
  if (!tasks.length) return;
  const { error } = await supabase!
    .from("tasks")
    .upsert(tasks.map(toRow), { onConflict: "id", ignoreDuplicates: true });
  if (error) throw error;
}

export async function setTaskDone(id: string, done: boolean) {
  const { error } = await supabase!.from("tasks").update({ done }).eq("id", id);
  if (error) throw error;
}

export type TaskChanges = Pick<Task, "space" | "title" | "priority"> & Partial<Pick<Task, "projectId" | "description" | "due" | "dueTime">>;

// Guarda los cambios de una tarea. Si cambia de sección o de proyecto, sus
// subtareas (`descendants`) se mueven con ella.
export async function updateTask(id: string, c: TaskChanges, descendants: string[]) {
  const place = { space: c.space, project_id: c.projectId ?? null };
  const { error } = await supabase!
    .from("tasks")
    .update({ ...place, title: c.title, description: c.description ?? null, due: c.due ?? null, due_time: (c.due && c.dueTime) || null, priority: c.priority })
    .eq("id", id);
  if (error) throw error;
  if (!descendants.length) return;
  const { error: subError } = await supabase!.from("tasks").update(place).in("id", descendants);
  if (subError) throw subError;
}

export async function deleteTask(id: string) {
  const { error } = await supabase!.from("tasks").delete().eq("id", id);
  if (error) throw error;
}

type ProjectRow = {
  id: string;
  space: Space;
  parent_id: string | null;
  name: string;
  color: string;
  created_at: string;
};

export async function fetchProjects(): Promise<Project[]> {
  const { data, error } = await supabase!
    .from("projects")
    .select("id, space, parent_id, name, color, created_at")
    .order("created_at");
  if (error) throw error;
  return (data as ProjectRow[]).map((r) => ({
    id: r.id,
    space: r.space,
    parentId: r.parent_id ?? undefined,
    name: r.name,
    color: r.color,
    createdAt: Date.parse(r.created_at),
  }));
}

export async function insertProject(p: Project) {
  const { error } = await supabase!.from("projects").insert({
    id: p.id,
    space: p.space,
    parent_id: p.parentId ?? null,
    name: p.name,
    color: p.color,
    created_at: new Date(p.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function updateProject(id: string, c: Pick<Project, "name" | "color" | "parentId">) {
  const { error } = await supabase!
    .from("projects")
    .update({ name: c.name, color: c.color, parent_id: c.parentId ?? null })
    .eq("id", id);
  if (error) throw error;
}

// Borra el proyecto; la base de datos borra también sus subproyectos y sus tareas.
export async function deleteProject(id: string) {
  const { error } = await supabase!.from("projects").delete().eq("id", id);
  if (error) throw error;
}

type CommentRow = { id: string; task_id: string; body: string; created_at: string };

export async function fetchComments(): Promise<Comment[]> {
  const { data, error } = await supabase!
    .from("task_comments")
    .select("id, task_id, body, created_at")
    .order("created_at");
  if (error) throw error;
  return (data as CommentRow[]).map((r) => ({
    id: r.id,
    taskId: r.task_id,
    body: r.body,
    createdAt: Date.parse(r.created_at),
  }));
}

export async function insertComment(c: Comment) {
  const { error } = await supabase!.from("task_comments").insert({
    id: c.id,
    task_id: c.taskId,
    body: c.body,
    created_at: new Date(c.createdAt).toISOString(),
  });
  if (error) throw error;
}

export async function deleteComment(id: string) {
  const { error } = await supabase!.from("task_comments").delete().eq("id", id);
  if (error) throw error;
}
