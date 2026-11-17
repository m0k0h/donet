export type Priority = 1 | 2 | 3 | 4;

export type Space = "personal" | "work";

export const SPACES: { id: Space; label: string }[] = [
  { id: "personal", label: "Personal" },
  { id: "work", label: "Laboral" },
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

export const VIEWS: { id: View; label: string }[] = [
  { id: "inbox", label: "Entrada" },
  { id: "today", label: "Hoy" },
  { id: "upcoming", label: "Próximo" },
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

// Tareas que guardaban las versiones antiguas en el navegador. Solo se leen para
// subirlas a la cuenta la primera vez que se inicia sesión.
const KEY = "donet.tasks.v1";

export function loadLegacyTasks(): Task[] {
  try {
    const raw: Task[] = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    // Las tareas creadas antes de existir los espacios pasan a Personal.
    return raw.map((t) => ({ ...t, space: t.space ?? "personal" }));
  } catch {
    return [];
  }
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

// Marca que las tareas guardadas en este navegador ya se subieron a la cuenta.
const UPLOADED_KEY = "donet.uploaded.v1";

export function localTasksUploaded(): boolean {
  try {
    return localStorage.getItem(UPLOADED_KEY) === "1";
  } catch {
    return true;
  }
}

export function markLocalTasksUploaded() {
  try {
    localStorage.setItem(UPLOADED_KEY, "1");
  } catch {}
}
