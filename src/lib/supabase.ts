import { createBrowserClient } from "@supabase/ssr";
import type { Priority, Project, Space, Task } from "./tasks";

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
  created_at: string;
};

const COLUMNS = "id, space, project_id, parent_id, title, description, done, priority, due, created_at";

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
