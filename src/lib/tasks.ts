export type Priority = 1 | 2 | 3 | 4;

export type Space = "personal" | "work";

// Las dos secciones son fijas y cada una tiene su propia dirección: /personal y /laboral.
export const SPACES: { id: Space; label: string; slug: string }[] = [
  { id: "personal", label: "Personal", slug: "personal" },
  { id: "work", label: "Laboral", slug: "laboral" },
];

export const spacePath = (space: Space) => `/${SPACES.find((s) => s.id === space)!.slug}`;

export type Task = {
  id: string;
  space: Space;
  projectId?: string; // sin proyecto = Entrada
  parentId?: string; // si es una subtarea, la tarea madre
  title: string;
  description?: string;
  done: boolean;
  priority: Priority;
  due?: string; // YYYY-MM-DD
  dueTime?: string; // HH:MM, solo si hay fecha
  createdAt: number;
  completedAt?: number; // cuándo se completó (las antiguas no lo tienen)
  hideDoneSubtasks?: boolean; // oculta sus subtareas completadas
};

// Comentario de una tarea: solo texto, en orden de llegada.
export type Comment = {
  id: string;
  taskId: string;
  body: string;
  createdAt: number;
};

// Colores que se pueden dar a un proyecto o a una etiqueta. El valor guardado es la clave.
export const PROJECT_COLORS: { id: string; label: string; hex: string }[] = [
  { id: "gray", label: "Gris", hex: "#8b919c" },
  { id: "red", label: "Rojo", hex: "#dc2626" },
  { id: "orange", label: "Naranja", hex: "#ea580c" },
  { id: "yellow", label: "Amarillo", hex: "#ca8a04" },
  { id: "green", label: "Verde", hex: "#16a34a" },
  { id: "teal", label: "Turquesa", hex: "#0d9488" },
  { id: "blue", label: "Azul", hex: "#2563eb" },
  { id: "violet", label: "Violeta", hex: "#7c3aed" },
  { id: "pink", label: "Rosa", hex: "#db2777" },
  { id: "brown", label: "Marrón", hex: "#92400e" },
];

export const projectHex = (color: string) =>
  (PROJECT_COLORS.find((c) => c.id === color) ?? PROJECT_COLORS[0]).hex;

export type Project = {
  id: string;
  space: Space;
  parentId?: string;
  name: string;
  color: string;
  createdAt: number;
};

// «agenda» es la vista de móvil que junta Hoy y Próximo (en la barra de abajo, «Próximos»).
export type View = "inbox" | "today" | "upcoming" | "agenda";

export const VIEWS: { id: View; label: string }[] = [
  { id: "inbox", label: "Entrada" },
  { id: "today", label: "Hoy" },
  { id: "upcoming", label: "Próximo" },
];

// Etiqueta: cada sección tiene las suyas. Usa los mismos colores que los proyectos.
export type Label = {
  id: string;
  space: Space;
  name: string;
  color: string;
  createdAt: number;
};

// Una etiqueta puesta en una tarea.
export type TaskLabel = { taskId: string; labelId: string };

export const sortLabels = (list: Label[]) => [...list].sort((a, b) => a.name.localeCompare(b.name, "es"));

export const sameName = (a: string, b: string) => a.localeCompare(b, "es", { sensitivity: "accent" }) === 0;

// Etiquetas escritas en el texto con @ («Comprar pan @casa @urgente»). Devuelve los nombres
// (sin repetir) y el texto sin ellas.
const TYPED_LABEL = /(^|\s)@([\p{L}\d][\p{L}\d_-]*)/gu;

export function typedLabels(text: string): { names: string[]; text: string } {
  const names: string[] = [];
  for (const m of text.matchAll(TYPED_LABEL)) if (!names.some((n) => sameName(n, m[2]))) names.push(m[2]);
  if (!names.length) return { names, text };
  return { names, text: text.replace(TYPED_LABEL, "$1").replace(/\s+/g, " ").trim() };
}

// Lo que se está mirando: una de las vistas, un proyecto, una etiqueta o el archivo de completadas.
export type Selection =
  | { kind: "view"; view: View }
  | { kind: "project"; id: string }
  | { kind: "label"; id: string }
  | { kind: "done" };

export const todayISO = () => new Date().toLocaleDateString("sv-SE");

// «Hoy», «Mañana», «Ayer» o la fecha corta («vie, 20 nov»), con la hora si la hay.
export function dueLabel(due: string | undefined, today: string, time?: string) {
  if (!due) return "Sin fecha";
  const days = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
  const day =
    days === 0
      ? "Hoy"
      : days === -1
        ? "Ayer"
        : days === 1
          ? "Mañana"
          : new Date(due + "T00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
  return time ? `${day} ${time}` : day;
}

// Vencida: fecha pasada o, si es hoy, hora ya pasada.
export const isOverdue = (t: Pick<Task, "due" | "dueTime">, today: string) =>
  !!t.due && (t.due < today || (t.due === today && !!t.dueTime && t.dueTime <= new Date().toTimeString().slice(0, 5)));

export const sortTasks = (list: Task[]) =>
  [...list].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      a.priority - b.priority ||
      (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
      (a.dueTime ?? "99").localeCompare(b.dueTime ?? "99") ||
      a.createdAt - b.createdAt,
  );

// Tareas de la selección. Entrada y los proyectos devuelven todas las de ese cajón
// (con sus subtareas, que se pintan anidadas); Hoy, Próximo y las etiquetas, una lista plana.
export function tasksIn(all: Task[], space: Space, sel: Selection, links: TaskLabel[] = []): Task[] {
  const today = todayISO();
  const tasks = all.filter((t) => t.space === space);
  if (sel.kind === "project") return tasks.filter((t) => t.projectId === sel.id);
  if (sel.kind === "done") return tasks.filter((t) => t.done);
  if (sel.kind === "label") {
    const ids = new Set(links.filter((l) => l.labelId === sel.id).map((l) => l.taskId));
    return tasks.filter((t) => ids.has(t.id));
  }
  if (sel.view === "inbox") return tasks.filter((t) => !t.projectId);
  if (sel.view === "today") return tasks.filter((t) => t.due && t.due <= today);
  if (sel.view === "agenda") return tasks.filter((t) => t.due);
  return tasks.filter((t) => t.due && t.due > today);
}

// Las vistas por fecha son planas; Entrada y proyectos se muestran como árbol.
export const isTree = (sel: Selection) => sel.kind === "project" || (sel.kind === "view" && sel.view === "inbox");

// Completadas agrupadas por el día en que se completaron, de la más reciente a la más
// antigua. Las que no tienen fecha (completadas antes de guardarla) van al final, en «Antes».
export function groupByCompletion(done: Task[], today: string): { label: string; tasks: Task[] }[] {
  const groups = new Map<string, Task[]>();
  const sorted = [...done].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  for (const t of sorted) {
    const key = t.completedAt ? new Date(t.completedAt).toLocaleDateString("sv-SE") : "";
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups].map(([day, tasks]) => ({
    label: !day
      ? "Antes"
      : day === today
        ? "Hoy"
        : Math.round((Date.parse(today) - Date.parse(day)) / 86400000) === 1
          ? "Ayer"
          : new Date(day + "T00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" }),
    tasks,
  }));
}

// Agenda (Hoy + Próximo): primero «Hoy», con lo vencido; después un grupo por día.
export function groupByDue(list: Task[], today: string): { key: string; label: string; tasks: Task[] }[] {
  const groups = new Map<string, Task[]>();
  for (const t of sortTasks(list)) {
    const key = t.due! <= today ? today : t.due!;
    groups.set(key, [...(groups.get(key) ?? []), t]);
  }
  return [...groups]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, tasks]) => {
      const days = Math.round((Date.parse(day) - Date.parse(today)) / 86400000);
      return {
        key: day,
        label:
          days === 0
            ? "Hoy"
            : days === 1
              ? "Mañana"
              : new Date(day + "T00:00").toLocaleDateString("es-ES", { weekday: "long", day: "numeric", month: "short" }),
        tasks,
      };
    });
}

// Cuántas se han completado desde el lunes de esta semana.
export function doneThisWeek(done: Task[]) {
  const monday = new Date();
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  return done.filter((t) => (t.completedAt ?? 0) >= monday.getTime()).length;
}

// Proyectos hijos de `parentId` (o los de primer nivel), por orden de creación.
export const childProjects = (all: Project[], space: Space, parentId?: string) =>
  all
    .filter((p) => p.space === space && p.parentId === parentId)
    .sort((a, b) => a.createdAt - b.createdAt);

// Todos los subproyectos (a cualquier profundidad) de un proyecto.
export function descendantProjectIds(all: Project[], id: string): string[] {
  return all.filter((p) => p.parentId === id).flatMap((p) => [p.id, ...descendantProjectIds(all, p.id)]);
}

// Lista los proyectos en orden de árbol con su profundidad, para los desplegables.
export function flattenProjects(all: Project[], space: Space, parentId?: string, depth = 0): { project: Project; depth: number }[] {
  return childProjects(all, space, parentId).flatMap((p) => [
    { project: p, depth },
    ...flattenProjects(all, space, p.id, depth + 1),
  ]);
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

// Preferencia de ocultar las tareas completadas en la lista.
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
