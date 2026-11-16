export type Priority = 1 | 2 | 3 | 4;

export type Space = "personal" | "work";

export const SPACES: { id: Space; label: string; icon: string }[] = [
  { id: "personal", label: "Personal", icon: "🏠" },
  { id: "work", label: "Laboral", icon: "💼" },
];

export type Task = {
  id: string;
  space: Space;
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

export function filterTasks(all: Task[], space: Space, view: View): Task[] {
  const today = todayISO();
  const tasks = all.filter((t) => t.space === space);
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
    const raw: Task[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    // Las tareas creadas antes de existir los espacios pasan a Personal.
    return raw.map((t) => ({ ...t, space: t.space ?? "personal" }));
  } catch {
    return [];
  }
}

export function saveTasks(tasks: Task[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(tasks));
  } catch {}
}

const SPACE_KEY = "donet.space.v1";

export function loadSpace(): Space {
  try {
    return localStorage.getItem(SPACE_KEY) === "work" ? "work" : "personal";
  } catch {
    return "personal";
  }
}

export function saveSpace(space: Space) {
  try {
    localStorage.setItem(SPACE_KEY, space);
  } catch {}
}
