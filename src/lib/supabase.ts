import { createClient } from "@supabase/supabase-js";
import type { Priority, Space, Task } from "./tasks";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

// Sin variables de entorno la app sigue funcionando solo con localStorage.
export const supabase = url && key ? createClient(url, key) : null;

type Row = {
  id: string;
  space: Space;
  title: string;
  done: boolean;
  priority: Priority;
  due: string | null;
  created_at: string;
};

const COLUMNS = "id, space, title, done, priority, due, created_at";

const toRow = (t: Task) => ({
  id: t.id,
  space: t.space,
  title: t.title,
  done: t.done,
  priority: t.priority,
  due: t.due ?? null,
  created_at: new Date(t.createdAt).toISOString(),
});

const fromRow = (r: Row): Task => ({
  id: r.id,
  space: r.space,
  title: r.title,
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
