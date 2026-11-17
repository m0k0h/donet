"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SPACES,
  VIEWS,
  descendantProjectIds,
  isTree,
  loadLegacyTasks,
  localTasksUploaded,
  markLocalTasksUploaded,
  projectHex,
  saveSpace,
  sortTasks,
  spacePath,
  tasksIn,
  todayISO,
  type Priority,
  type Project,
  type Selection,
  type Space,
  type Task,
} from "@/lib/tasks";
import {
  deleteProject,
  deleteTask,
  fetchProjects,
  fetchTasks,
  insertProject,
  insertTasks,
  setTaskDone,
  supabase,
  updateProject,
  updateTask,
} from "@/lib/supabase";
import AuthScreen from "./AuthScreen";
import Dialog from "./Dialog";
import Logo from "./Logo";
import ProjectDialog from "./ProjectDialog";
import ProjectTree from "./ProjectTree";
import SetupScreen from "./SetupScreen";
import TaskDialog, { type TaskDraft } from "./TaskDialog";
import ThemeToggle from "./ThemeToggle";
import { CheckIcon, FolderIcon, PencilIcon, PlusIcon, SlidersIcon, SpaceIcon, SubtaskIcon, SwapIcon, TrashIcon, ViewIcon } from "./icons";

const PRIORITY_CIRCLE: Record<Priority, string> = {
  1: "border-[#c4121f] bg-[#c4121f]/15",
  2: "border-[#d97706] bg-[#d97706]/15",
  3: "border-[#2563eb] bg-[#2563eb]/15",
  4: "border-ring",
};

function dueLabel(due: string | undefined, today: string) {
  if (!due) return "Sin fecha";
  const days = Math.round((Date.parse(due) - Date.parse(today)) / 86400000);
  if (days === 0) return "Hoy";
  if (days === -1) return "Ayer";
  if (days === 1) return "Mañana";
  return new Date(due + "T00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

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

// Todas las subtareas (a cualquier profundidad) de una tarea.
function descendantIds(all: Task[], id: string): string[] {
  return all.filter((t) => t.parentId === id).flatMap((t) => [t.id, ...descendantIds(all, t.id)]);
}

function Tasks({ space }: { space: Space }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selection, setSelection] = useState<Selection>(INBOX);
  const [title, setTitle] = useState("");
  const [composerOpen, setComposerOpen] = useState(false);
  const [taskDialog, setTaskDialog] = useState<TaskDraft | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  // Nuevo proyecto (con su padre, si se crea dentro de otro) o edición de uno existente.
  const [projectDialog, setProjectDialog] = useState<{ parentId?: string; project?: Project } | null>(null);
  const [projectsSheet, setProjectsSheet] = useState(false);
  // undefined = comprobando sesión, null = sin sesión.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [syncError, setSyncError] = useState("");

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

  const list = tasksIn(tasks, space, sel);
  const tree = isTree(sel);
  const childrenOf = (id: string) => sortTasks(list.filter((t) => t.parentId === id));
  // En árbol, las raíces son las tareas cuya madre no está en la lista.
  const roots = sortTasks(tree ? list.filter((t) => !t.parentId || !list.some((p) => p.id === t.parentId)) : list);

  const pendingIn = (s: Selection) => tasksIn(tasks, space, s).filter((t) => !t.done).length;
  const count = list.filter((t) => !t.done).length;

  // Ruta del proyecto (Casa › Cocina) para el subtítulo.
  const ancestors: Project[] = [];
  for (let p = projectById(project?.parentId); p; p = projectById(p.parentId)) ancestors.unshift(p);

  // Dónde caen las tareas nuevas: en el proyecto abierto o, si no, en Entrada; en Hoy, con fecha de hoy.
  const destProjectId = project?.id;
  const destDue = sel.kind === "view" && sel.view === "today" ? today : undefined;

  function select(s: Selection) {
    setSelection(s);
    setProjectsSheet(false);
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
    createTask({ space, projectId: destProjectId, title: t, due: destDue, priority: 4 });
    setTitle("");
  }

  // Modo completo: abre el formulario con lo que ya se haya escrito.
  function openTaskDialog() {
    setTaskDialog({ space, projectId: destProjectId, title: title.trim(), due: destDue, priority: 4 });
    setTitle("");
    setComposerOpen(false);
  }

  function addSubtask(parent: Task, text: string) {
    createTask({ space: parent.space, projectId: parent.projectId, parentId: parent.id, title: text, priority: 4 });
  }

  // Guarda los cambios de una tarea. Si cambia de sección o proyecto, sus subtareas van con ella.
  function saveTask(task: Task, d: TaskDraft) {
    const descendants = descendantIds(tasks, task.id);
    const sub = new Set(descendants);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, ...d }
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

  function toggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !task.done } : t)));
    sync(setTaskDone(task.id, !task.done));
  }
  // Al borrar una tarea se van también sus subtareas (la base de datos hace lo mismo).
  function remove(id: string) {
    setTasks((prev) => {
      const gone = new Set([id, ...descendantIds(prev, id)]);
      return prev.filter((t) => !gone.has(t.id));
    });
    sync(deleteTask(id));
  }

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
            <p className="text-sm text-muted">
              {[spaceLabel, ...ancestors.map((a) => a.name)].join(" › ")} ·{" "}
              {count === 1 ? "1 tarea pendiente" : `${count} tareas pendientes`}
            </p>
          </header>

          {/* Modo rápido: escribe y Enter. El botón de ajustes abre el modo completo. */}
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
            {/* Solo en Hoy y Próximo: ahí no se ve a dónde va la tarea nueva. */}
            {sel.kind === "view" && sel.view !== "inbox" && (
              <p className="px-1 text-[13px] text-muted">Se guarda en Entrada{destDue ? ", para hoy" : ""}</p>
            )}
          </form>

          {loaded && roots.length === 0 && (
            <p className="py-16 text-center text-muted">Nada por aquí. ¡Te has ganado un donete!</p>
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
                context={
                  tree
                    ? undefined
                    : [
                        tasks.find((p) => p.id === t.parentId)?.title,
                        projectById(t.projectId)?.name ?? "Entrada",
                      ]
                        .filter(Boolean)
                        .join(" · ")
                }
                onToggle={toggle}
                onEdit={setEditingTask}
                onRemove={remove}
                onAddSubtask={addSubtask}
              />
            ))}
          </ul>
        </div>
      </main>

      {/* Botón flotante para añadir: solo móvil */}
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
          onDelete={projectDialog.project && (() => removeProject(projectDialog.project!))}
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
  context,
  childrenOf,
  onToggle,
  onEdit,
  onRemove,
  onAddSubtask,
}: {
  task: Task;
  depth: number;
  today: string;
  tree: boolean;
  context?: string;
  childrenOf: (id: string) => Task[];
  onToggle: (t: Task) => void;
  onEdit: (t: Task) => void;
  onRemove: (id: string) => void;
  onAddSubtask: (parent: Task, title: string) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [sub, setSub] = useState("");
  const overdue = !t.done && !!t.due && t.due < today;
  const children = tree ? childrenOf(t.id) : [];
  const indent = { paddingLeft: depth * 28 };

  function submitSub(e: React.FormEvent) {
    e.preventDefault();
    if (!sub.trim()) return;
    onAddSubtask(t, sub.trim());
    setSub("");
  }

  const meta = [
    t.done ? null : dueLabel(t.due, today),
    !t.done && t.priority < 4 ? `P${t.priority}` : null,
    context,
  ].filter(Boolean);

  return (
    <li className="flex flex-col">
      <div className="group flex items-start gap-1 border-b border-line py-1.5" style={indent}>
        <button
          onClick={() => onToggle(t)}
          aria-label={`${t.done ? "Marcar como pendiente" : "Completar"}: ${t.title}`}
          className="grid h-11 w-11 shrink-0 place-items-center"
        >
          {t.done ? (
            <span className="grid h-6 w-6 place-items-center rounded-full bg-green text-on-green">
              <CheckIcon size={14} />
            </span>
          ) : (
            <span className={`h-5 w-5 rounded-full border-2 ${PRIORITY_CIRCLE[t.priority]}`} />
          )}
        </button>
        {/* Pulsar la tarea la abre para editarla. */}
        <button
          onClick={() => onEdit(t)}
          aria-label={`Editar: ${t.title}`}
          className="flex min-w-0 flex-1 flex-col gap-0.5 rounded-lg py-2.5 text-left"
        >
          <span className={`break-words ${t.done ? "text-muted line-through" : ""}`}>{t.title}</span>
          {t.description && <span className="line-clamp-2 break-words text-sm text-ink-soft">{t.description}</span>}
          {t.done ? (
            <span className="text-[13px] font-semibold text-green">Hecha</span>
          ) : (
            <span className={`text-[13px] ${overdue ? "font-semibold text-danger" : "text-muted"}`}>
              {meta.join(" · ")}
            </span>
          )}
        </button>
        {tree && (
          <button
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
            />
          ))}
        </ul>
      )}

      {adding && (
        <form
          onSubmit={submitSub}
          onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
          className="flex items-center gap-2 border-b border-line py-1.5"
          style={{ paddingLeft: (depth + 1) * 28 + 12 }}
        >
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
        </form>
      )}
    </li>
  );
}
