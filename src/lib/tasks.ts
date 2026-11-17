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
  createdAt: number;
};

// Colores que se pueden dar a un proyecto. El valor guardado es la clave.
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

export type View = "inbox" | "today" | "upcoming";

export const VIEWS: { id: View; label: string }[] = [
  { id: "inbox", label: "Entrada" },
  { id: "today", label: "Hoy" },
  { id: "upcoming", label: "Próximo" },
];

// Lo que se está mirando: una de las vistas o un proyecto.
export type Selection = { kind: "view"; view: View } | { kind: "project"; id: string };

export const todayISO = () => new Date().toLocaleDateString("sv-SE");

export const sortTasks = (list: Task[]) =>
  [...list].sort(
    (a, b) =>
      Number(a.done) - Number(b.done) ||
      a.priority - b.priority ||
      (a.due ?? "9999").localeCompare(b.due ?? "9999") ||
      a.createdAt - b.createdAt,
  );

// Tareas de la selección. Entrada y los proyectos devuelven todas las de ese cajón
// (con sus subtareas, que se pintan anidadas); Hoy y Próximo, una lista plana por fecha.
export function tasksIn(all: Task[], space: Space, sel: Selection): Task[] {
  const today = todayISO();
  const tasks = all.filter((t) => t.space === space);
  if (sel.kind === "project") return tasks.filter((t) => t.projectId === sel.id);
  if (sel.view === "inbox") return tasks.filter((t) => !t.projectId);
  if (sel.view === "today") return tasks.filter((t) => t.due && t.due <= today);
  return tasks.filter((t) => t.due && t.due > today);
}

// Las vistas por fecha son planas; Entrada y proyectos se muestran como árbol.
export const isTree = (sel: Selection) => sel.kind === "project" || sel.view === "inbox";

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
