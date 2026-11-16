export type Priority = 1 | 2 | 3 | 4;

export type Task = {
  id: string;
  title: string;
  done: boolean;
  priority: Priority;
  due?: string; // YYYY-MM-DD
  createdAt: number;
};

export type View = "inbox" | "today" | "upcoming";

export const VIEWS: { id: View; label: string; icon: string }[] = [
  { id: "inbox", label: "Entrada", icon: "📥" },
  { id: "today", label: "Hoy", icon: "📅" },
  { id: "upcoming", label: "Próximo", icon: "🗓️" },
];

export const todayISO = () => new Date().toLocaleDateString("sv-SE");

export function filterTasks(tasks: Task[], view: View): Task[] {
  const today = todayISO();
  const list =
    view === "today"
      ? tasks.filter((t) => t.due && t.due <= today)
      : view === "upcoming"
        ? tasks.filter((t) => t.due && t.due > today)
        : tasks;
  return [...list].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      a.priority - b.priority ||
      (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
      a.createdAt - b.createdAt,
  );
}

const KEY = "donet.tasks.v1";

export function loadTasks(): Task[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? "[]");
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch {}
}
