"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  SPACES,
  VIEWS,
  descendantProjectIds,
  dueLabel,
  isOverdue,
  isTree,
  loadHideDone,
  loadLegacyTasks,
  localTasksUploaded,
  markLocalTasksUploaded,
  projectHex,
  saveHideDone,
  saveSpace,
  sortTasks,
  spacePath,
  tasksIn,
  todayISO,
  type Comment,
  type Priority,
  type Project,
  type Selection,
  type Space,
  type Task,
} from "@/lib/tasks";
import {
  deleteComment,
  deleteProject,
  deleteTask,
  fetchComments,
  fetchProjects,
  fetchTasks,
  insertComment,
  insertProject,
  insertTasks,
  setTasksDone,
  supabase,
  updateProject,
  updateTask,
} from "@/lib/supabase";
import AuthScreen from "./AuthScreen";
import CommentsDialog from "./CommentsDialog";
import ConfirmDialog from "./ConfirmDialog";
import { DetectedDateChip, useDetectedDate } from "./DetectedDate";
import { EmptyFilter } from "./EmptyFilter";
import Dialog from "./Dialog";
import Logo from "./Logo";
import ProjectDialog from "./ProjectDialog";
import ProjectTree from "./ProjectTree";
import SetupScreen from "./SetupScreen";
import TaskDialog, { type TaskDraft } from "./TaskDialog";
import ThemeToggle from "./ThemeToggle";
import {
  CalendarIcon,
  CheckIcon,
  ClockIcon,
  CommentIcon,
  EyeIcon,
  FlagIcon,
  FolderIcon,
  PencilIcon,
  PlusIcon,
  ProgressPie,
  SlidersIcon,
  SpaceIcon,
  SubtaskIcon,
  SwapIcon,
  TrashIcon,
  ViewIcon,
} from "./icons";

const PRIORITY_HEX: Record<Priority, string> = { 1: "#c4121f", 2: "#d97706", 3: "#2563eb", 4: "" };

// Color de la fecha según lo cerca que está: vencida, hoy, mañana, esta semana o más adelante.
function dueTone(t: Task, today: string) {
  if (isOverdue(t, today)) return "text-danger";
  const days = Math.round((Date.parse(t.due!) - Date.parse(today)) / 86400000);
  if (days === 0) return "text-green";
  if (days === 1) return "text-[var(--soon)]";
  if (days < 7) return "text-[var(--week)]";
  return "text-muted";
}

// Dónde vive una tarea, para mostrarlo en Hoy y Próximo: su tarea madre y su proyecto (o Entrada).
type RowContext = { parent?: string; project?: Project };

const PRIORITY_CIRCLE: Record<Priority, string> = {
  1: "border-[#c4121f] bg-[#c4121f]/15",
  2: "border-[#d97706] bg-[#d97706]/15",
  3: "border-[#2563eb] bg-[#2563eb]/15",
  4: "border-ring",
};

// Solo hay dos secciones, así que un único botón muestra la actual y lleva a la otra.
// Cada sección es una dirección propia, por eso es un enlace. En móvil va sin el nombre.
function SpaceSwitch({ space, showLabel }: { space: Space; showLabel?: boolean }) {
  const current = SPACES.find((s) => s.id === space)!;
  const other = SPACES.find((s) => s.id !== space)!;
  return (
    <Link
      href={spacePath(other.id)}
      aria-label={`Sección: ${current.label}. Cambiar a ${other.label}`}
      title={`Cambiar a ${other.label}`}
      className={`flex min-h-11 items-center rounded-lg border border-ring/60 bg-bg hover:border-ring ${
        showLabel ? "gap-2.5 px-2.5" : "gap-2 pl-2 pr-2.5"
      }`}
    >
      <span className="grid h-[26px] w-[26px] shrink-0 place-items-center rounded-md bg-accent text-white">
        <SpaceIcon space={space} size={15} />
      </span>
      {showLabel && <span className="flex-1 text-[15px] font-bold">{current.label}</span>}
      <span className="text-muted">
        <SwapIcon size={16} />
      </span>
    </Link>
  );
}

// La app solo funciona con Supabase configurado: no hay modo sin conexión.
export default function TaskApp({ space }: { space: Space }) {
  return supabase ? <Tasks space={space} /> : <SetupScreen />;
}

const INBOX: Selection = { kind: "view", view: "inbox" };

// Tareas madre de una tarea, de la más cercana hacia arriba.
function ancestorIds(all: Task[], id: string): string[] {
  const out: string[] = [];
  for (let t = all.find((x) => x.id === id); t?.parentId; t = all.find((x) => x.id === t!.parentId)) out.push(t.parentId);
  return out;
}

// Todas las subtareas (a cualquier profundidad) de una tarea.
function descendantIds(all: Task[], id: string): string[] {
  return all.filter((t) => t.parentId === id).flatMap((t) => [t.id, ...descendantIds(all, t.id)]);
}

function Tasks({ space }: { space: Space }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [comments, setComments] = useState<Comment[]>([]);
  // Tarea cuyos comentarios están abiertos.
  const [commentsTaskId, setCommentsTaskId] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [selection, setSelection] = useState<Selection>(INBOX);
  const [title, setTitle] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [taskDialog, setTaskDialog] = useState<TaskDraft | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Nuevo proyecto (con su padre, si se crea dentro de otro) o edición de uno existente.
  const [projectDialog, setProjectDialog] = useState<{ parentId?: string; project?: Project } | null>(null);
  const [projectsSheet, setProjectsSheet] = useState(false);
  // Confirmación pendiente antes de borrar algo.
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  // undefined = comprobando sesión, null = sin sesión.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [syncError, setSyncError] = useState("");
  const [hideDone, setHideDone] = useState(false);

  // La preferencia se lee al montar (no en el render inicial, para no chocar con el servidor).
  useEffect(() => setHideDone(loadHideDone()), []);

  function toggleHideDone() {
    setHideDone((h) => {
      saveHideDone(!h);
      return !h;
    });
  }

  // Recuerda la última sección abierta para volver a ella al entrar por la dirección principal.
  useEffect(() => saveSpace(space), [space]);

  useEffect(() => {
    const { data } = supabase!.auth.onAuthStateChange((_event, session) => setUserId(session?.user.id ?? null));
    return () => data.subscription.unsubscribe();
  }, []);

  // Al iniciar sesión: sube una vez las tareas antiguas de este navegador y carga las de la cuenta.
  useEffect(() => {
    if (userId === undefined) return;
    if (!userId) {
      setTasks([]);
      setProjects([]);
      setComments([]);
      setLoaded(false);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        if (!localTasksUploaded()) {
          await insertTasks(loadLegacyTasks());
          markLocalTasksUploaded();
        }
        const [remoteTasks, remoteProjects] = await Promise.all([fetchTasks(), fetchProjects()]);
        if (cancelled) return;
        setTasks(remoteTasks);
        setProjects(remoteProjects);
        setSyncError("");
        // Los comentarios van aparte: si la tabla aún no existe, las tareas se ven igual.
        fetchComments()
          .then((c) => !cancelled && setComments(c))
          .catch(() => {});
      } catch {
        if (!cancelled) setSyncError("No se han podido cargar las tareas. Comprueba la conexión.");
      }
      if (!cancelled) setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  // Guarda un cambio en la base de datos; si falla, vuelve al estado real del servidor.
  function sync(op: Promise<void>) {
    op.then(() => setSyncError("")).catch(async () => {
      setSyncError("No se ha podido guardar el cambio. Comprueba la conexión.");
      try {
        const [remoteTasks, remoteProjects] = await Promise.all([fetchTasks(), fetchProjects()]);
        setTasks(remoteTasks);
        setProjects(remoteProjects);
        setComments(await fetchComments());
      } catch {}
    });
  }

  const today = todayISO();
  const spaceLabel = SPACES.find((s) => s.id === space)!.label;
  const projectById = (id?: string) => projects.find((p) => p.id === id);

  // Si el proyecto elegido no es de esta sección (o ya no existe), se muestra Entrada.
  const sel: Selection =
    selection.kind === "project" && projectById(selection.id)?.space !== space ? INBOX : selection;
  const project = sel.kind === "project" ? projectById(sel.id) : undefined;

  const all = tasksIn(tasks, space, sel);
  const list = hideDone ? all.filter((t) => !t.done) : all;
  const hiddenDone = all.length - list.length;
  // Progreso de las subtareas directas de una tarea (de todas, no solo las de la vista).
  const progressOf = (id: string) => {
    const subs = tasks.filter((t) => t.parentId === id);
    return { done: subs.filter((t) => t.done).length, total: subs.length };
  };
  const tree = isTree(sel);
  const childrenOf = (id: string) => sortTasks(list.filter((t) => t.parentId === id));
  // En árbol, las raíces son las tareas cuya madre no está en la lista.
  const roots = sortTasks(tree ? list.filter((t) => !t.parentId || !list.some((p) => p.id === t.parentId)) : list);

  const pendingIn = (s: Selection) => tasksIn(tasks, space, s).filter((t) => !t.done).length;
  const count = list.filter((t) => !t.done).length;

  // Ruta del proyecto (Casa › Cocina) para el subtítulo.
  const ancestors: Project[] = [];
  for (let p = projectById(project?.parentId); p; p = projectById(p.parentId)) ancestors.unshift(p);

  // Hoy y Próximo son filtros: no se añaden tareas desde ahí. Solo desde Entrada o un proyecto.
  const canAdd = !(sel.kind === "view" && (sel.view === "today" || sel.view === "upcoming"));

  // Dónde caen las tareas nuevas: en el proyecto abierto o, si no, en Entrada.
  const destProjectId = project?.id;

  // Fecha escrita en el propio texto («mañana», «el viernes»…).
  const quickDate = useDetectedDate(title);

  function select(s: Selection) {
    setSelection(s);
    setProjectsSheet(false);
    setComposerOpen(false);
  }

  function createTask(d: TaskDraft & { parentId?: string }) {
    const task: Task = {
      id: crypto.randomUUID(),
      space: d.space,
      projectId: d.projectId,
      parentId: d.parentId,
      title: d.title,
      description: d.description,
      done: false,
      priority: d.priority,
      due: d.due,
      dueTime: d.due ? d.dueTime : undefined,
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, task]);
    sync(insertTasks([task]));
  }

  // Modo rápido: solo el texto.
  function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const d = quickDate.detected;
    createTask({ space, projectId: destProjectId, title: d?.title ?? t, due: d?.due, dueTime: d?.time, priority: 4 });
    setTitle("");
    quickDate.reset();
  }

  // Modo completo: abre el formulario con lo que ya se haya escrito.
  function openTaskDialog() {
    const d = quickDate.detected;
    setTaskDialog({
      space,
      projectId: destProjectId,
      title: d?.title ?? title.trim(),
      due: d?.due,
      dueTime: d?.time,
      priority: 4,
    });
    setTitle("");
    quickDate.reset();
    setComposerOpen(false);
  }

  // A una tarea completada no se le añaden subtareas.
  function addSubtask(parent: Task, text: string, due?: string, dueTime?: string) {
    if (parent.done) return;
    createTask({ space: parent.space, projectId: parent.projectId, parentId: parent.id, title: text, due, dueTime, priority: 4 });
  }

  // Guarda los cambios de una tarea. Si cambia de sección o proyecto, sus subtareas van con ella.
  function saveTask(task: Task, d: TaskDraft) {
    const descendants = descendantIds(tasks, task.id);
    const sub = new Set(descendants);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, ...d, dueTime: d.due ? d.dueTime : undefined }
          : sub.has(t.id)
            ? { ...t, space: d.space, projectId: d.projectId }
            : t,
      ),
    );
    sync(updateTask(task.id, d, descendants));
  }

  function saveProject(project: Project, p: { name: string; color: string; parentId?: string }) {
    setProjects((prev) => prev.map((x) => (x.id === project.id ? { ...x, ...p } : x)));
    sync(updateProject(project.id, p));
  }

  // Al borrar un proyecto se van sus subproyectos y sus tareas (la base de datos hace lo mismo).
  function removeProject(project: Project) {
    const gone = new Set([project.id, ...descendantProjectIds(projects, project.id)]);
    setProjects((prev) => prev.filter((p) => !gone.has(p.id)));
    setTasks((prev) => prev.filter((t) => !t.projectId || !gone.has(t.projectId)));
    setSelection(INBOX);
    sync(deleteProject(project.id));
  }

  function createProject(p: { name: string; color: string; parentId?: string }) {
    const created: Project = { id: crypto.randomUUID(), space, createdAt: Date.now(), ...p };
    setProjects((prev) => [...prev, created]);
    setSelection({ kind: "project", id: created.id });
    sync(insertProject(created));
  }

  // Completar exige tener todas las subtareas completadas. Volver a dejar pendiente una
  // subtarea deja pendientes también sus tareas madre.
  function toggle(task: Task) {
    if (!task.done) {
      if (tasks.some((t) => t.parentId === task.id && !t.done)) return;
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: true } : t)));
      sync(setTasksDone([task.id], true));
      return;
    }
    reopen([task.id, ...ancestorIds(tasks, task.id)]);
  }

  // Deja pendientes las tareas indicadas que estén completadas.
  function reopen(ids: string[]) {
    const toReopen = ids.filter((id) => tasks.find((t) => t.id === id)?.done);
    if (!toReopen.length) return;
    const set = new Set(toReopen);
    setTasks((prev) => prev.map((t) => (set.has(t.id) ? { ...t, done: false } : t)));
    sync(setTasksDone(toReopen, false));
  }
  function askRemoveTask(id: string) {
    const task = tasks.find((t) => t.id === id);
    if (!task) return;
    const subs = descendantIds(tasks, id).length;
    setConfirm({
      title: "Borrar tarea",
      message: `¿Borrar «${task.title}»${
        subs ? ` y ${subs === 1 ? "su subtarea" : `sus ${subs} subtareas`}` : ""
      }? No se puede deshacer.`,
      onConfirm: () => remove(id),
    });
  }

  function askRemoveProject(project: Project) {
    setConfirm({
      title: "Borrar proyecto",
      message: `¿Borrar «${project.name}»? Se borrarán también sus subproyectos y todas sus tareas. No se puede deshacer.`,
      onConfirm: () => removeProject(project),
    });
  }

  // Al borrar una tarea se van también sus subtareas (la base de datos hace lo mismo).
  function remove(id: string) {
    const gone = new Set([id, ...descendantIds(tasks, id)]);
    setTasks((prev) => prev.filter((t) => !gone.has(t.id)));
    setComments((prev) => prev.filter((c) => !gone.has(c.taskId)));
    sync(deleteTask(id));
  }

  function addComment(taskId: string, body: string) {
    const comment: Comment = { id: crypto.randomUUID(), taskId, body, createdAt: Date.now() };
    setComments((prev) => [...prev, comment]);
    sync(insertComment(comment));
  }

  function askRemoveComment(c: Comment) {
    setConfirm({
      title: "Borrar comentario",
      message: "¿Borrar este comentario? No se puede deshacer.",
      onConfirm: () => {
        setComments((prev) => prev.filter((x) => x.id !== c.id));
        sync(deleteComment(c.id));
      },
    });
  }

  const commentCount = (taskId: string) => comments.filter((c) => c.taskId === taskId).length;
  const commentsTask = tasks.find((t) => t.id === commentsTaskId);

  if (userId === undefined) return <div className="min-h-dvh" />;
  if (!userId) return <AuthScreen />;

  const signOut = (
    <button
      onClick={() => supabase!.auth.signOut()}
      className="min-h-11 rounded-lg px-3.5 text-sm font-semibold text-ink-soft hover:bg-track"
    >
      Cerrar sesión
    </button>
  );

  const projectTree = (
    <ProjectTree
      space={space}
      projects={projects}
      selectedId={project?.id}
      pendingOf={(id) => pendingIn({ kind: "project", id })}
      onSelect={(id) => select({ kind: "project", id })}
      onAdd={(parentId) => {
        setProjectsSheet(false);
        setProjectDialog({ parentId });
      }}
    />
  );

  const heading = project ? project.name : VIEWS.find((v) => sel.kind === "view" && v.id === sel.view)!.label;

  return (
    <div data-space={space} className="flex min-h-dvh">
      {/* Barra lateral: solo escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-6 overflow-y-auto bg-sunk px-4 py-6 md:flex">
        <div className="pl-2">
          <Logo size={28} surface="var(--sunk)" />
        </div>
        <SpaceSwitch space={space} showLabel />
        <nav aria-label="Vistas" className="flex flex-col gap-1">
          {VIEWS.map((v) => {
            const active = sel.kind === "view" && sel.view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => select({ kind: "view", view: v.id })}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-left text-[15px] ${
                  active ? "bg-accent-soft font-bold text-accent-ink" : "font-medium hover:bg-track"
                }`}
              >
                <ViewIcon view={v.id} />
                <span className="flex-1">{v.label}</span>
                <span className={`text-[13px] ${active ? "" : "text-muted"}`}>
                  {pendingIn({ kind: "view", view: v.id }) || ""}
                </span>
              </button>
            );
          })}
        </nav>
        {projectTree}
        {/* Zona de ajustes, abajo del todo */}
        <div className="mt-auto flex items-center justify-between">
          {signOut}
          <ThemeToggle />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-32 pt-4 md:px-6 md:pb-16 md:pt-10">
        <div className="mx-auto flex max-w-[720px] flex-col gap-6">
          <div className="flex items-center justify-between md:hidden">
            <Logo size={24} />
            <div className="flex items-center gap-1">
              {signOut}
              <SpaceSwitch space={space} />
            </div>
          </div>

          {syncError && (
            <p role="alert" className="rounded-xl bg-sunk px-4 py-3 text-sm font-semibold text-danger">
              {syncError}
            </p>
          )}

          <header className="flex flex-col gap-1">
            <h1 className="flex items-center gap-3 text-[30px] font-extrabold leading-tight tracking-[-0.02em] md:text-[34px]">
              {project && (
                <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: projectHex(project.color) }} />
              )}
              <span className="min-w-0 flex-1 break-words">{heading}</span>
              {project && (
                <button
                  onClick={() => setProjectDialog({ project })}
                  aria-label={`Editar proyecto ${project.name}`}
                  title="Editar proyecto"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
                >
                  <PencilIcon size={20} />
                </button>
              )}
            </h1>
            <div className="flex flex-wrap items-center justify-between gap-x-3">
              <p className="text-sm text-muted">
                {[spaceLabel, ...ancestors.map((a) => a.name)].join(" › ")} ·{" "}
                {count === 1 ? "1 tarea pendiente" : `${count} tareas pendientes`}
              </p>
              <button
                onClick={toggleHideDone}
                aria-pressed={hideDone}
                className="-mr-2 inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-muted hover:bg-track hover:text-ink"
              >
                <EyeIcon size={15} off={hideDone} />
                {hideDone ? `Mostrar completadas${hiddenDone ? ` (${hiddenDone})` : ""}` : "Ocultar completadas"}
              </button>
            </div>
          </header>

          {/* Modo rápido: escribe y Enter. El botón de ajustes abre el modo completo. */}
          {canAdd && (
            <form
              onSubmit={quickAdd}
              className={`${composerOpen ? "flex" : "hidden"} flex-col gap-1.5 rounded-xl bg-sunk p-3 md:flex`}
            >
              <div className="flex items-center gap-2">
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Añadir tarea…"
                  aria-label="Nombre de la tarea"
                  autoFocus={composerOpen}
                  className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted"
                />
                <button
                  type="button"
                  onClick={openTaskDialog}
                  aria-label="Más opciones"
                  title="Más opciones: descripción, fecha, prioridad, proyecto…"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
                >
                  <SlidersIcon />
                </button>
                <button
                  type="submit"
                  disabled={!title.trim()}
                  className="min-h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40"
                >
                  Añadir
                </button>
              </div>
              {quickDate.detected && <DetectedDateChip detected={quickDate.detected} onIgnore={quickDate.ignore} />}
            </form>
          )}

          {loaded && roots.length === 0 && (
            sel.kind === "view" && sel.view !== "inbox" ? (
              <EmptyFilter view={sel.view} />
            ) : (
              <p className="py-16 text-center text-muted">Nada por aquí. ¡Te has ganado un donete!</p>
            )
          )}

          <ul className="flex flex-col">
            {roots.map((t) => (
              <TaskRow
                key={t.id}
                task={t}
                depth={0}
                today={today}
                tree={tree}
                childrenOf={childrenOf}
                hideToday={sel.kind === "view" && sel.view === "today"}
                context={
                  tree
                    ? undefined
                    : { parent: tasks.find((p) => p.id === t.parentId)?.title, project: projectById(t.projectId) }
                }
                onToggle={toggle}
                onEdit={setEditingTask}
                onRemove={askRemoveTask}
                onAddSubtask={addSubtask}
                commentCount={commentCount}
                onComments={(t) => setCommentsTaskId(t.id)}
                progressOf={progressOf}
              />
            ))}
          </ul>
        </div>
      </main>

      {/* Botón flotante para añadir: solo móvil */}
      {canAdd && (
        <button
          onClick={() => setComposerOpen((o) => !o)}
          aria-label={composerOpen ? "Cerrar añadir tarea" : "Añadir tarea"}
          aria-expanded={composerOpen}
          className="fixed bottom-24 right-4 grid h-14 w-14 place-items-center rounded-2xl bg-accent text-white shadow-lg md:hidden"
        >
          <span className={`transition-transform ${composerOpen ? "rotate-45" : ""}`}>
            <PlusIcon size={26} />
          </span>
        </button>
      )}

      {/* Barra inferior: solo móvil. Vistas y proyectos a la izquierda, tema a la derecha. */}
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-1 bg-sunk px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <nav aria-label="Vistas" className="flex flex-1 gap-1">
          {VIEWS.map((v) => {
            const active = sel.kind === "view" && sel.view === v.id;
            return (
              <button
                key={v.id}
                onClick={() => select({ kind: "view", view: v.id })}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs ${
                  active ? "bg-accent-soft font-bold text-accent-ink" : "font-semibold text-muted"
                }`}
              >
                <ViewIcon view={v.id} size={22} />
                {v.label}
              </button>
            );
          })}
          <button
            onClick={() => setProjectsSheet(true)}
            aria-current={project ? "page" : undefined}
            className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs ${
              project ? "bg-accent-soft font-bold text-accent-ink" : "font-semibold text-muted"
            }`}
          >
            <FolderIcon size={22} />
            Proyectos
          </button>
        </nav>
        <ThemeToggle />
      </div>

      {projectsSheet && (
        <Dialog title={`Proyectos · ${spaceLabel}`} onClose={() => setProjectsSheet(false)}>
          <div className="max-h-[60dvh] overflow-y-auto">
            {projectTree}
          </div>
        </Dialog>
      )}

      {projectDialog && (
        <ProjectDialog
          space={space}
          projects={projects}
          parentId={projectDialog.parentId}
          project={projectDialog.project}
          onSave={(p) => (projectDialog.project ? saveProject(projectDialog.project, p) : createProject(p))}
          onDelete={projectDialog.project && (() => askRemoveProject(projectDialog.project!))}
          onClose={() => setProjectDialog(null)}
        />
      )}

      {taskDialog && (
        <TaskDialog
          initial={taskDialog}
          projects={projects}
          onSave={createTask}
          onClose={() => setTaskDialog(null)}
        />
      )}

      {commentsTask && (
        <CommentsDialog
          task={commentsTask}
          comments={comments.filter((c) => c.taskId === commentsTask.id)}
          onAdd={(body) => addComment(commentsTask.id, body)}
          onRemove={askRemoveComment}
          onClose={() => setCommentsTaskId(null)}
        />
      )}

      {confirm && (
        <ConfirmDialog
          title={confirm.title}
          message={confirm.message}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}

      {editingTask && (
        <TaskDialog
          editing
          subtask={!!editingTask.parentId}
          initial={{
            space: editingTask.space,
            projectId: editingTask.projectId,
            title: editingTask.title,
            description: editingTask.description,
            due: editingTask.due,
            dueTime: editingTask.dueTime,
            priority: editingTask.priority,
          }}
          projects={projects}
          onSave={(d) => saveTask(editingTask, d)}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

function TaskRow({
  task: t,
  depth,
  today,
  tree,
  hideToday,
  context,
  childrenOf,
  onToggle,
  onEdit,
  onRemove,
  onAddSubtask,
  commentCount,
  onComments,
  progressOf,
}: {
  task: Task;
  depth: number;
  today: string;
  tree: boolean;
  // En Hoy no hace falta repetir «Hoy» en cada tarea: solo se ve la hora.
  hideToday?: boolean;
  context?: RowContext;
  childrenOf: (id: string) => Task[];
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onRemove: (id: string) => void;
  onAddSubtask: (parent: Task, title: string, due?: string, dueTime?: string) => void;
  commentCount: (taskId: string) => number;
  onComments: (t: Task) => void;
  progressOf: (id: string) => { done: number; total: number };
}) {
  const [adding, setAdding] = useState(false);
  const subForm = useRef<HTMLFormElement>(null);
  const subButton = useRef<HTMLButtonElement>(null);

  // El campo de subtarea se cierra al pulsar fuera de él o con Escape.
  useEffect(() => {
    if (!adding) return;
    const onPointer = (e: PointerEvent) => {
      const target = e.target as Node;
      if (!subForm.current?.contains(target) && !subButton.current?.contains(target)) setAdding(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setAdding(false);
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [adding]);
  const [sub, setSub] = useState("");
  const subDate = useDetectedDate(sub);
  const overdue = !t.done && isOverdue(t, today);
  const children = tree ? childrenOf(t.id) : [];
  const indent = { paddingLeft: depth * 28 };

  function submitSub(e: React.FormEvent) {
    e.preventDefault();
    if (!sub.trim()) return;
    const d = subDate.detected;
    onAddSubtask(t, d?.title ?? sub.trim(), d?.due, d?.time);
    setSub("");
    subDate.reset();
  }

  const showDue = !t.done && !!t.due;
  const onlyTime = showDue && hideToday && t.due === today && !overdue;
  const showPriority = !t.done && t.priority < 4;
  const nComments = commentCount(t.id);
  const progress = progressOf(t.id);
  // No se puede completar mientras le queden subtareas pendientes.
  const blocked = !t.done && progress.done < progress.total;
  const showMeta =
    (showDue && (!onlyTime || !!t.dueTime)) || showPriority || progress.total > 0 || nComments > 0 || !!context;

  return (
    <li className="flex flex-col">
      <div className="group flex items-start gap-1 border-b border-line py-1.5" style={indent}>
        <button
          onClick={() => onToggle(t)}
          disabled={blocked}
          aria-label={`${t.done ? "Marcar como pendiente" : "Completar"}: ${t.title}`}
          title={blocked ? "Completa antes sus subtareas" : undefined}
          className="grid h-11 w-11 shrink-0 place-items-center disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t.done ? (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-green text-on-green">
              <CheckIcon size={14} />
            </span>
          ) : (
            <span className={`h-5 w-5 rounded-full border-2 ${PRIORITY_CIRCLE[t.priority]}`} />
          )}
        </button>
        {/* Pulsar la tarea la abre para editarla (el botón del título es el accesible por teclado;
            el resto de la zona también responde al ratón). Desplegar la descripción no edita. */}
        <div onClick={() => onEdit(t)} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 py-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onEdit(t);
            }}
            aria-label={`Editar: ${t.title}`}
            className="break-words rounded text-left"
          >
            <span className={t.done ? "text-muted line-through" : ""}>{t.title}</span>
          </button>
          {t.description && <Description text={t.description} />}
          {showMeta && (
            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
              {showDue &&
                (onlyTime ? (
                  t.dueTime && (
                    <span className="inline-flex items-center gap-1 font-medium text-green">
                      <ClockIcon size={13} />
                      {t.dueTime}
                    </span>
                  )
                ) : (
                  <span className={`inline-flex items-center gap-1 font-medium ${dueTone(t, today)}`}>
                    <CalendarIcon size={13} />
                    {dueLabel(t.due, today, t.dueTime)}
                  </span>
                ))}
              {showPriority && (
                <span
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: PRIORITY_HEX[t.priority] }}
                  aria-label={`Prioridad ${t.priority}`}
                >
                  <FlagIcon size={13} />P{t.priority}
                </span>
              )}
              {progress.total > 0 && (
                <span
                  className={`inline-flex items-center gap-1 font-medium ${
                    progress.done === progress.total ? "text-green" : "text-muted"
                  }`}
                  aria-label={`${progress.done} de ${progress.total} subtareas completadas`}
                >
                  <ProgressPie size={13} value={progress.done / progress.total} />
                  {progress.done}/{progress.total}
                </span>
              )}
              {nComments > 0 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onComments(t);
                  }}
                  aria-label={`${nComments === 1 ? "1 comentario" : `${nComments} comentarios`}: ${t.title}`}
                  className="inline-flex items-center gap-1 rounded font-medium text-muted hover:text-ink"
                >
                  <CommentIcon size={13} />
                  {nComments}
                </button>
              )}
              {context && (
                <span className="ml-auto inline-flex min-w-0 max-w-full items-center gap-1.5 text-muted">
                  {context.parent && (
                    <>
                      <SubtaskIcon size={13} />
                      <span className="min-w-0 truncate">{context.parent}</span>
                      <span aria-hidden="true">·</span>
                    </>
                  )}
                  {context.project ? (
                    <>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: projectHex(context.project.color) }}
                      />
                      <span className="min-w-0 truncate">{context.project.name}</span>
                    </>
                  ) : (
                    <>
                      <ViewIcon view="inbox" size={13} />
                      Entrada
                    </>
                  )}
                </span>
              )}
            </div>
          )}
        </div>
        {/* Solo las tareas pendientes admiten subtareas nuevas. */}
        {tree && !t.done && (
          <button
            ref={subButton}
            onClick={() => setAdding((a) => !a)}
            aria-label={`Añadir subtarea a: ${t.title}`}
            aria-expanded={adding}
            title="Añadir subtarea"
            className="grid h-11 w-11 shrink-0 place-items-center text-muted hover:text-ink md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
          >
            <SubtaskIcon size={18} />
          </button>
        )}
        <button
          onClick={() => onComments(t)}
          aria-label={`Comentarios de: ${t.title}`}
          title="Comentarios"
          className="grid h-11 w-11 shrink-0 place-items-center text-muted hover:text-ink md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
        >
          <CommentIcon size={18} />
        </button>
        <button
          onClick={() => onRemove(t.id)}
          aria-label={`Eliminar: ${t.title}`}
          className="grid h-11 w-11 shrink-0 place-items-center text-muted hover:text-danger md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
        >
          <TrashIcon size={18} />
        </button>
      </div>

      {children.length > 0 && (
        <ul className="flex flex-col">
          {children.map((c) => (
            <TaskRow
              key={c.id}
              task={c}
              depth={depth + 1}
              today={today}
              tree={tree}
              childrenOf={childrenOf}
              onToggle={onToggle}
              onEdit={onEdit}
              onRemove={onRemove}
              onAddSubtask={onAddSubtask}
              commentCount={commentCount}
              onComments={onComments}
              progressOf={progressOf}
            />
          ))}
        </ul>
      )}

      {adding && !t.done && (
        <form
          onSubmit={submitSub}
          ref={subForm}
          className="flex flex-col gap-1 border-b border-line py-1.5"
          style={{ paddingLeft: (depth + 1) * 28 + 12 }}
        >
          <div className="flex items-center gap-2">
          <input
            value={sub}
            onChange={(e) => setSub(e.target.value)}
            placeholder="Añadir subtarea…"
            aria-label={`Nueva subtarea de ${t.title}`}
            autoFocus
            className="min-h-11 min-w-0 flex-1 bg-transparent px-1 text-base outline-none placeholder:text-muted"
          />
          <button
            type="submit"
            disabled={!sub.trim()}
            className="min-h-9 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            Añadir
          </button>
          </div>
          {subDate.detected && <DetectedDateChip detected={subDate.detected} onIgnore={subDate.ignore} />}
        </form>
      )}
    </li>
  );
}

// Descripción de una tarea en la lista: dos líneas y, si es más larga, «Ver más» para leerla entera.
function Description({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const [long, setLong] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);

  // ¿Se corta a dos líneas? Se vuelve a mirar si cambia el ancho.
  useEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setLong(el.scrollHeight > el.clientHeight + 1);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text, open]);

  return (
    <div className="flex flex-col items-start">
      <p ref={ref} className={`whitespace-pre-line break-words text-sm text-ink-soft ${open ? "" : "line-clamp-2"}`}>
        {text}
      </p>
      {(long || open) && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            setOpen((o) => !o);
          }}
          aria-expanded={open}
          className="-my-1 rounded py-1 text-[13px] font-semibold text-accent-ink hover:underline"
        >
          {open ? "Ver menos" : "Ver más"}
        </button>
      )}
    </div>
  );
}
