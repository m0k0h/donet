"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  SPACES,
  VIEWS,
  descendantProjectIds,
  dueLabel,
  isOverdue,
  doneThisWeek,
  groupByCompletion,
  dayLabel,
  groupByDue,
  isTree,
  loadLegacyTasks,
  localTasksUploaded,
  markLocalTasksUploaded,
  projectHex,
  sameName,
  saveSpace,
  sortLabels,
  sortTasks,
  spacePath,
  tasksIn,
  todayISO,
  typedLabels,
  type Comment,
  type Label,
  type Priority,
  type Project,
  type Selection,
  type Space,
  type Task,
  type TaskLabel,
} from "@/lib/tasks";
import {
  deleteComment,
  deleteLabel,
  deleteProject,
  deleteTask,
  fetchComments,
  fetchLabels,
  fetchProjects,
  fetchTaskLabels,
  fetchTasks,
  insertComment,
  insertLabels,
  insertProject,
  insertTasks,
  setCollapsed,
  setShowDoneSubtasks,
  setTaskLabels,
  setTasksDone,
  supabase,
  updateLabel,
  updateProject,
  updateTask,
} from "@/lib/supabase";
import { consumeOpenShopping, loadPendingInvite } from "@/lib/shopping";
import { consumeReopenSettings } from "@/lib/google";
import { MAX_NAME_LENGTH, profileName, saveProfileName } from "@/lib/profile";
import { EVENT_DAYS, EventList, eventsByDay, useCalendarEvents } from "./CalendarEvents";
import { GoogleCalendarsSettings } from "./GoogleCalendars";
import AuthScreen from "./AuthScreen";
import CommentsDialog from "./CommentsDialog";
import ConfirmDialog from "./ConfirmDialog";
import { DetectedDateChip, useDetectedDate } from "./DetectedDate";
import { EmptyFilter } from "./EmptyFilter";
import { EmptyInbox } from "./EmptyInbox";
import Dialog, { fieldClass } from "./Dialog";
import LabelDialog from "./LabelDialog";
import { LabelList, LabelTag, TypedLabels } from "./Labels";
import Logo from "./Logo";
import PageHeader from "./PageHeader";
import ProjectDialog from "./ProjectDialog";
import ProjectTree from "./ProjectTree";
import SetupScreen from "./SetupScreen";
import ShoppingPanel, { ShoppingNotice, useShopping } from "./ShoppingPanel";
import TaskDialog, { type TaskDraft } from "./TaskDialog";
import { ThemeChoice } from "./ThemeToggle";
import {
  CalendarIcon,
  CartIcon,
  CheckIcon,
  ChevronIcon,
  ClockIcon,
  CommentIcon,
  DotsIcon,
  EyeIcon,
  FlagIcon,
  GearIcon,
  MoreIcon,
  PencilIcon,
  PlusIcon,
  ProgressPie,
  SlidersIcon,
  SpaceIcon,
  SubtaskIcon,
  SwapIcon,
  TagIcon,
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

// Acceso destacado a la lista de la compra compartida, en verde aunque se esté en otra sección.
function ShoppingNavItem({ active, pending, onClick }: { active: boolean; pending: number; onClick: () => void }) {
  return (
    <div data-space="compra">
      <button
        onClick={onClick}
        aria-current={active ? "page" : undefined}
        className={`flex min-h-12 w-full items-center gap-3 rounded-lg border px-2.5 text-left text-[15px] ${
          active ? "border-transparent bg-accent-soft font-bold text-accent-ink" : "border-accent/40 font-semibold hover:bg-accent-soft/50"
        }`}
      >
        <span className="grid h-[28px] w-[28px] shrink-0 place-items-center rounded-md bg-accent text-white">
          <CartIcon size={17} />
        </span>
        <span className="flex-1">Compra</span>
        {pending > 0 && <span className={`text-[13px] ${active ? "" : "text-accent"}`}>{pending}</span>}
      </button>
    </div>
  );
}

const HIDE_EVENTS_KEY = "donet.hideEvents";
function loadHideEvents() {
  try {
    return typeof window !== "undefined" && localStorage.getItem(HIDE_EVENTS_KEY) === "1";
  } catch {
    return false;
  }
}
function saveHideEvents(hide: boolean) {
  try {
    if (hide) localStorage.setItem(HIDE_EVENTS_KEY, "1");
    else localStorage.removeItem(HIDE_EVENTS_KEY);
  } catch {}
}

// Cuenta con la que se ha entrado y la rueda que abre Ajustes (nombre, tema, cerrar sesión y lo que venga).
function AccountCard({
  name,
  email,
  onSettings,
  className = "",
}: {
  name: string;
  email: string;
  onSettings: () => void;
  className?: string;
}) {
  const shown = name || email;
  return (
    <div className={`flex items-center gap-3 rounded-xl py-2 pl-3 pr-1.5 ${className}`}>
      <span
        aria-hidden="true"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent text-base font-bold uppercase text-white"
      >
        {shown.charAt(0) || "?"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-bold" title={shown || undefined}>
          {shown || "Sesión iniciada"}
        </p>
        <p className="truncate text-[13px] font-semibold text-muted" title={email || undefined}>
          {name ? email : "Tu cuenta"}
        </p>
      </div>
      <button
        onClick={onSettings}
        aria-label="Ajustes"
        title="Ajustes"
        className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
      >
        <GearIcon size={22} />
      </button>
    </div>
  );
}

// Ajustes → Tu nombre: el que ven los demás en las listas compartidas.
function NameSettings({ name, onSaved }: { name: string; onSaved: () => void }) {
  const [value, setValue] = useState(name);
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const trimmed = value.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!trimmed || trimmed === name) return;
    setState("saving");
    try {
      await saveProfileName(trimmed);
      setState("saved");
      onSaved();
    } catch {
      setState("error");
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted">Tu nombre</h3>
      <form onSubmit={submit} className="flex gap-2">
        <input
          aria-label="Tu nombre"
          data-no-autofocus
          value={value}
          maxLength={MAX_NAME_LENGTH}
          onChange={(e) => {
            setValue(e.target.value);
            setState("idle");
          }}
          autoComplete="nickname"
          className={`${fieldClass} min-w-0 flex-1`}
        />
        <button
          type="submit"
          disabled={!trimmed || trimmed === name || state === "saving"}
          className="min-h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40"
        >
          Guardar
        </button>
      </form>
      <p className={`text-[13px] ${state === "error" ? "text-danger" : "text-muted"}`} aria-live="polite">
        {state === "error"
          ? "No se ha podido guardar. Comprueba la conexión."
          : state === "saved"
            ? "Guardado. Ya te ven así en tus listas compartidas."
            : "Es el nombre con el que te ven en las listas compartidas."}
      </p>
    </section>
  );
}

// Botón de la barra inferior del móvil: icono y nombre, resaltado si es la pantalla actual.
function BarButton({
  active,
  tone,
  onClick,
  icon,
  children,
}: {
  active: boolean;
  tone?: "accent";
  onClick: () => void;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs ${
        active ? "bg-accent-soft font-bold text-accent-ink" : `font-semibold ${tone === "accent" ? "text-accent" : "text-muted"}`
      }`}
    >
      {icon}
      {children}
    </button>
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
  const [labels, setLabels] = useState<Label[]>([]);
  const [taskLabels, setTaskLabelLinks] = useState<TaskLabel[]>([]);
  // Nueva etiqueta o edición de una existente.
  const [labelDialog, setLabelDialog] = useState<{ label?: Label } | null>(null);
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
  // Móvil: la pantalla «Más» (cuenta, proyectos y etiquetas) y la ventana de Ajustes.
  const [more, setMore] = useState(false);
  const [settings, setSettings] = useState(false);
  // Confirmación pendiente antes de borrar algo.
  const [confirm, setConfirm] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);
  // undefined = comprobando sesión, null = sin sesión.
  const [userId, setUserId] = useState<string | null | undefined>(undefined);
  const [email, setEmail] = useState("");
  // Nombre visible: el elegido en Ajustes o, si no hay, el del correo.
  const [name, setName] = useState("");
  const [syncError, setSyncError] = useState("");
  // Recién completadas: se ven tachadas un momento antes de irse de la lista.
  const [justDone, setJustDone] = useState<Set<string>>(new Set());
  // Última tarea que se fue de la lista al completarla, para poder deshacerlo.
  const [undo, setUndo] = useState<{ id: string; title: string } | null>(null);
  // La Compra se abre en el panel principal, sin salir de la app.
  const [shopping, setShopping] = useState(false);
  // Tarea a la que se acaba de ir desde una agenda, para señalarla en su proyecto.
  const [goneTo, setGoneTo] = useState<string | null>(null);
  // Completadas desplegadas al final de la lista; se vuelven a plegar al cambiar de lista.
  const [showDoneHere, setShowDoneHere] = useState(false);
  const shop = useShopping(userId);
  // Eventos de los calendarios de Google elegidos en Ajustes.
  const calendar = useCalendarEvents(userId);
  // Eventos ocultos en Hoy y Próximo (se recuerda en este navegador).
  const [hideEvents, setHideEvents] = useState(loadHideEvents);

  // Se llega a la Compra desde /compra o con una invitación pendiente.
  useEffect(() => {
    if (consumeOpenShopping() || loadPendingInvite()) setShopping(true);
    // Al volver de conectar una cuenta de Google, Ajustes sigue abierto.
    if (consumeReopenSettings()) setSettings(true);
  }, []);

  // Al cambiar de sección se cierra la Compra (en Laboral no tiene entrada en la barra lateral).
  const prevSpace = useRef(space);
  useEffect(() => {
    if (prevSpace.current === space) return;
    prevSpace.current = space;
    setShopping(false);
  }, [space]);

  // Al llegar desde una agenda, se busca la tarea (o, si está plegada, su madre visible) y se resalta.
  useEffect(() => {
    if (!goneTo) return;
    setGoneTo(null);
    for (let id: string | undefined = goneTo; id; id = tasks.find((t) => t.id === id)?.parentId) {
      const el = document.querySelector<HTMLElement>(`[data-task-id="${id}"]`);
      if (!el) continue;
      el.scrollIntoView({ block: "center", behavior: "smooth" });
      el.animate([{ backgroundColor: "var(--accent-soft)" }, { backgroundColor: "transparent" }], {
        duration: 1600,
        easing: "ease-out",
      });
      break;
    }
  }, [goneTo, tasks]);

  // El aviso de «Deshacer» se va solo a los pocos segundos.
  useEffect(() => {
    if (!undo) return;
    const t = setTimeout(() => setUndo(null), 5000);
    return () => clearTimeout(t);
  }, [undo]);

  // Recuerda la última sección abierta para volver a ella al entrar por la dirección principal.
  useEffect(() => saveSpace(space), [space]);

  useEffect(() => {
    const { data } = supabase!.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setEmail(session?.user.email ?? "");
      setName(profileName(session?.user));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Al iniciar sesión: sube una vez las tareas antiguas de este navegador y carga las de la cuenta.
  useEffect(() => {
    if (userId === undefined) return;
    if (!userId) {
      setTasks([]);
      setProjects([]);
      setComments([]);
      setLabels([]);
      setTaskLabelLinks([]);
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
        // Las etiquetas también: sin sus tablas, la app funciona sin ellas.
        Promise.all([fetchLabels(), fetchTaskLabels()])
          .then(([l, links]) => {
            if (cancelled) return;
            setLabels(l);
            setTaskLabelLinks(links);
          })
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
        const [l, links] = await Promise.all([fetchLabels(), fetchTaskLabels()]);
        setLabels(l);
        setTaskLabelLinks(links);
      } catch {}
    });
  }

  const today = todayISO();
  const spaceLabel = SPACES.find((s) => s.id === space)!.label;
  const projectById = (id?: string) => projects.find((p) => p.id === id);

  // Si el proyecto elegido no es de esta sección (o ya no existe), se muestra Entrada.
  const labelById = (id: string) => labels.find((l) => l.id === id);
  const spaceLabels = sortLabels(labels.filter((l) => l.space === space));
  const labelsOf = (taskId: string) =>
    sortLabels(taskLabels.filter((x) => x.taskId === taskId).flatMap((x) => labelById(x.labelId) ?? []));

  // Si el proyecto o la etiqueta elegidos no son de esta sección (o ya no existen), se muestra Entrada.
  const sel: Selection =
    (selection.kind === "project" && projectById(selection.id)?.space !== space) ||
    (selection.kind === "label" && labelById(selection.id)?.space !== space)
      ? INBOX
      : selection;
  const project = sel.kind === "project" ? projectById(sel.id) : undefined;
  const label = sel.kind === "label" ? labelById(sel.id) : undefined;

  const list = tasksIn(tasks, space, sel, taskLabels);
  const doneView = sel.kind === "done";
  // Lo completado se va de las listas (salvo un momento, recién completado) y vive en Completadas.
  const showInList = (t: Task) => !t.done || justDone.has(t.id);
  // Progreso de las subtareas directas de una tarea (de todas, no solo las de la vista).
  const progressOf = (id: string) => {
    const subs = tasks.filter((t) => t.parentId === id);
    return { done: subs.filter((t) => t.done).length, total: subs.length };
  };
  // Hoy, Próximo y Próximos (móvil): agendas por fecha. Solo se consultan; pulsar una tarea lleva a su proyecto.
  const dateView = sel.kind === "view" && sel.view !== "inbox";
  // Entrada y proyectos son árboles; en las agendas, cada tarea también despliega sus subtareas
  // (todas, tengan fecha o no), y la que ya va dentro de su madre no se repite suelta.
  const tree = isTree(sel) || dateView;
  // Las subtareas completadas no se ven bajo su tarea, salvo que esa tarea las muestre.
  const childrenOf = (id: string) => {
    const show = tasks.find((p) => p.id === id)?.showDoneSubtasks;
    return sortTasks((dateView ? tasks : list).filter((t) => t.parentId === id && (show || showInList(t))));
  };
  // En árbol, las raíces son las tareas cuya madre no está en la lista.
  const isRoot = (t: Task) => !tree || !t.parentId || !list.some((p) => p.id === t.parentId);
  const roots = doneView ? [] : sortTasks(list.filter((t) => isRoot(t) && showInList(t)));
  // Completadas de esta lista que ya no se ven: se despliegan al final, la última completada primero.
  // Hoy y Próximo no las ofrecen: son agendas de lo que queda por hacer.
  const doneRoots =
    doneView || dateView
      ? []
      : list
          .filter((t) => isRoot(t) && t.done && !justDone.has(t.id))
          .sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));
  const doneHere = doneRoots.length;

  // Eventos de calendario de esta sección, por día. Hoy los muestra encima de las tareas;
  // Próximo y Próximos (móvil) los mezclan con las tareas en grupos por día.
  const allEventDays = eventsByDay(calendar.events, space);
  const eventDays = hideEvents ? new Map<string, never[]>() : allEventDays;
  const lastEventDay = (() => {
    const d = new Date(today + "T00:00");
    d.setDate(d.getDate() + EVENT_DAYS);
    return d.toLocaleDateString("sv-SE");
  })();
  const todayEvents = sel.kind === "view" && sel.view === "today" ? (eventDays.get(today) ?? []) : [];
  const dayView = sel.kind === "view" && (sel.view === "agenda" || sel.view === "upcoming");
  const dayGroups = dayView
    ? (() => {
        const groups = new Map(groupByDue(roots, today).map((g) => [g.key, g]));
        for (const day of eventDays.keys()) {
          if (day > lastEventDay || day < today || (sel.view === "upcoming" && day === today)) continue;
          if (!groups.has(day)) groups.set(day, { key: day, label: dayLabel(day, today), tasks: [] });
        }
        return [...groups.values()]
          .sort((a, b) => a.key.localeCompare(b.key))
          .map((g) => ({ ...g, events: eventDays.get(g.key) ?? [] }));
      })()
    : [];
  const viewHasEvents = todayEvents.length > 0 || dayGroups.some((g) => g.events.length > 0);
  // El botón de ocultar sale en Hoy y Próximo si hay eventos que enseñar en esta sección.
  const eventsToggle =
    sel.kind === "view" &&
    sel.view !== "inbox" &&
    [...allEventDays.keys()].some((d) => (sel.view === "today" ? d === today : d >= today && d <= lastEventDay));
  function toggleHideEvents() {
    const next = !hideEvents;
    setHideEvents(next);
    saveHideEvents(next);
  }

  const pendingIn = (s: Selection) => tasksIn(tasks, space, s, taskLabels).filter((t) => !t.done).length;
  const count = list.filter((t) => !t.done).length;

  // Ruta del proyecto (Casa › Cocina) para el subtítulo.
  const ancestors: Project[] = [];
  for (let p = projectById(project?.parentId); p; p = projectById(p.parentId)) ancestors.unshift(p);

  // Hoy, Próximo, las etiquetas y Completadas son filtros: no se añaden tareas desde ahí.
  // Solo desde Entrada o un proyecto (y nunca con la Compra abierta).
  const canAdd = !shopping && !more && isTree(sel);

  // Dónde caen las tareas nuevas: en el proyecto abierto o, si no, en Entrada.
  const destProjectId = project?.id;

  // Etiquetas escritas con @ y fecha escrita en el propio texto («mañana», «el viernes»…).
  const quickTyped = typedLabels(title);
  const quickDate = useDetectedDate(quickTyped.text);

  function select(s: Selection) {
    setSelection(s);
    setShowDoneHere(false);
    setShopping(false);
    setMore(false);
    setComposerOpen(false);
  }

  // Desde las agendas, una tarea lleva a su proyecto (o a Entrada) y se señala allí.
  function goToTask(t: Task) {
    select(t.projectId ? { kind: "project", id: t.projectId } : INBOX);
    setGoneTo(t.id);
  }

  function openShopping() {
    setShopping(true);
    setMore(false);
    setComposerOpen(false);
  }

  function openMore() {
    setMore(true);
    setShopping(false);
    setComposerOpen(false);
  }

  // Pasa nombres de etiqueta a ids, creando las que aún no existan en la sección.
  function resolveLabels(s: Space, names: string[]) {
    const created: Label[] = [];
    const ids = names.map((name) => {
      const existing = labels.find((l) => l.space === s && sameName(l.name, name)) ?? created.find((l) => sameName(l.name, name));
      if (existing) return existing.id;
      const l: Label = { id: crypto.randomUUID(), space: s, name, color: "gray", createdAt: Date.now() };
      created.push(l);
      return l.id;
    });
    return { ids: [...new Set(ids)], created };
  }

  // Deja la tarea con esas etiquetas. Devuelve la operación para guardarla
  // (después de crear la tarea, si es nueva).
  function applyLabels(taskId: string, s: Space, names: string[]) {
    const { ids, created } = resolveLabels(s, names);
    const before = taskLabels.filter((x) => x.taskId === taskId).map((x) => x.labelId);
    if (!created.length && ids.length === before.length && ids.every((id) => before.includes(id))) return null;
    if (created.length) setLabels((prev) => [...prev, ...created]);
    setTaskLabelLinks((prev) => [...prev.filter((x) => x.taskId !== taskId), ...ids.map((labelId) => ({ taskId, labelId }))]);
    return () => insertLabels(created).then(() => setTaskLabels(taskId, ids));
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
    const saveLabels = applyLabels(task.id, task.space, d.labels);
    sync(insertTasks([task]).then(() => saveLabels?.()));
  }

  // Modo rápido: solo el texto.
  function quickAdd(e: React.FormEvent) {
    e.preventDefault();
    const t = quickTyped.text.trim();
    if (!t) return;
    const d = quickDate.detected;
    createTask({ space, projectId: destProjectId, title: d?.title ?? t, due: d?.due, dueTime: d?.time, priority: 4, labels: quickTyped.names });
    setTitle("");
    quickDate.reset();
  }

  // Modo completo: abre el formulario con lo que ya se haya escrito.
  function openTaskDialog() {
    const d = quickDate.detected;
    setTaskDialog({
      space,
      projectId: destProjectId,
      title: d?.title ?? quickTyped.text.trim(),
      due: d?.due,
      dueTime: d?.time,
      priority: 4,
      labels: quickTyped.names,
    });
    setTitle("");
    quickDate.reset();
    setComposerOpen(false);
  }

  // A una tarea completada no se le añaden subtareas.
  function addSubtask(parent: Task, text: string, due?: string, dueTime?: string, labelNames: string[] = []) {
    if (parent.done) return;
    // La subtarea nueva tiene que verse: si la madre estaba plegada, se despliega.
    if (parent.collapsed) toggleCollapsed(parent);
    createTask({ space: parent.space, projectId: parent.projectId, parentId: parent.id, title: text, due, dueTime, priority: 4, labels: labelNames });
  }

  // Guarda los cambios de una tarea. Si cambia de sección o proyecto, sus subtareas van con ella.
  function saveTask(task: Task, { labels: labelNames, ...d }: TaskDraft) {
    const descendants = descendantIds(tasks, task.id);
    const sub = new Set(descendants);
    const saveLabels = applyLabels(task.id, d.space, labelNames);
    setTasks((prev) =>
      prev.map((t) =>
        t.id === task.id
          ? { ...t, ...d, dueTime: d.due ? d.dueTime : undefined }
          : sub.has(t.id)
            ? { ...t, space: d.space, projectId: d.projectId }
            : t,
      ),
    );
    sync(updateTask(task.id, d, descendants).then(() => saveLabels?.()));
  }

  function createLabel(l: { name: string; color: string }) {
    const created: Label = { id: crypto.randomUUID(), space, createdAt: Date.now(), ...l };
    setLabels((prev) => [...prev, created]);
    select({ kind: "label", id: created.id });
    sync(insertLabels([created]));
  }

  function saveLabel(label: Label, l: { name: string; color: string }) {
    setLabels((prev) => prev.map((x) => (x.id === label.id ? { ...x, ...l } : x)));
    sync(updateLabel(label.id, l));
  }

  // Borrar una etiqueta la quita de sus tareas; las tareas no se tocan.
  function askRemoveLabel(label: Label) {
    const n = taskLabels.filter((x) => x.labelId === label.id).length;
    setConfirm({
      title: "Borrar etiqueta",
      message: `¿Borrar «${label.name}»?${n ? ` Se quitará de ${n === 1 ? "1 tarea, que no se borra" : `${n} tareas, que no se borran`}.` : ""} No se puede deshacer.`,
      onConfirm: () => {
        setLabels((prev) => prev.filter((x) => x.id !== label.id));
        setTaskLabelLinks((prev) => prev.filter((x) => x.labelId !== label.id));
        setSelection(INBOX);
        sync(deleteLabel(label.id));
      },
    });
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
    select({ kind: "project", id: created.id });
    sync(insertProject(created));
  }

  // Completar exige tener todas las subtareas completadas. Volver a dejar pendiente una
  // subtarea deja pendientes también sus tareas madre.
  function toggle(task: Task) {
    if (!task.done) {
      if (tasks.some((t) => t.parentId === task.id && !t.done)) return;
      const at = Date.now();
      setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: true, completedAt: at } : t)));
      sync(setTasksDone([task.id], true, at));
      if (!doneView && isRoot(task)) {
        setJustDone((prev) => new Set(prev).add(task.id));
        setTimeout(
          () =>
            setJustDone((prev) => {
              const next = new Set(prev);
              next.delete(task.id);
              return next;
            }),
          1200,
        );
        setUndo({ id: task.id, title: task.title });
      }
      return;
    }
    reopen([task.id, ...ancestorIds(tasks, task.id)]);
  }

  // Deja pendientes las tareas indicadas que estén completadas.
  function reopen(ids: string[]) {
    const toReopen = ids.filter((id) => tasks.find((t) => t.id === id)?.done);
    if (!toReopen.length) return;
    const set = new Set(toReopen);
    setTasks((prev) => prev.map((t) => (set.has(t.id) ? { ...t, done: false, completedAt: undefined } : t)));
    sync(setTasksDone(toReopen, false));
  }
  // Plegar o desplegar las subtareas de una tarea (se guarda en la tarea).
  function toggleCollapsed(task: Task) {
    const collapsed = !task.collapsed;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, collapsed } : t)));
    sync(setCollapsed(task.id, collapsed));
  }
  // Mostrar u ocultar las subtareas completadas de una tarea (se guarda en la tarea).
  function toggleShowDoneSubtasks(task: Task) {
    const show = !task.showDoneSubtasks;
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, showDoneSubtasks: show } : t)));
    sync(setShowDoneSubtasks(task.id, show));
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
    setTaskLabelLinks((prev) => prev.filter((x) => !gone.has(x.taskId)));
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

  // Lo que se ve en Más está seleccionado: un proyecto, una etiqueta o Completadas.
  const offScreen = shopping || more;

  const projectTree = (
    <ProjectTree
      space={space}
      projects={projects}
      selectedId={offScreen ? undefined : project?.id}
      pendingOf={(id) => pendingIn({ kind: "project", id })}
      onSelect={(id) => select({ kind: "project", id })}
      onAdd={(parentId) => setProjectDialog({ parentId })}
    />
  );

  const labelList = (
    <LabelList
      labels={spaceLabels}
      selectedId={offScreen ? undefined : label?.id}
      pendingOf={(id) => pendingIn({ kind: "label", id })}
      onSelect={(id) => select({ kind: "label", id })}
      onAdd={() => setLabelDialog({})}
    />
  );

  const heading = project
    ? project.name
    : label
      ? label.name
      : doneView
        ? "Completadas"
        : sel.kind === "view" && sel.view === "agenda"
          ? "Próximos"
          : VIEWS.find((v) => sel.kind === "view" && v.id === sel.view)!.label;
  const weekDone = doneView ? doneThisWeek(list) : 0;
  // Próximos (móvil) también se ve activo si se llegó a Hoy o Próximo desde escritorio.
  const datesActive = !offScreen && sel.kind === "view" && sel.view !== "inbox";
  const inboxActive = !offScreen && sel.kind === "view" && sel.view === "inbox";
  const moreActive = more || (!shopping && (!!project || !!label || doneView));

  const rowProps = {
    today,
    childrenOf,
    onToggle: toggle,
    onEdit: setEditingTask,
    onGoTo: dateView ? goToTask : undefined,
    onRemove: askRemoveTask,
    onAddSubtask: addSubtask,
    commentCount,
    onComments: (t: Task) => setCommentsTaskId(t.id),
    progressOf,
    labelsOf,
    spaceLabels,
  };
  const flatContext = (t: Task): RowContext => ({
    parent: tasks.find((p) => p.id === t.parentId)?.title,
    project: projectById(t.projectId),
  });

  return (
    <div data-space={space} className="flex min-h-dvh">
      {/* Barra lateral: solo escritorio */}
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col gap-6 overflow-y-auto bg-sunk px-4 py-6 md:flex">
        <div className="pl-2">
          <Logo size={28} surface="var(--sunk)" />
        </div>
        <div className="flex flex-col gap-2">
          <SpaceSwitch space={space} showLabel />
          {/* La Compra es de casa: en Laboral no aparece. */}
          {space === "personal" && (
            <ShoppingNavItem active={shopping} pending={shop.pendingCount} onClick={openShopping} />
          )}
        </div>
        <nav aria-label="Vistas" className="flex flex-col gap-1">
          {VIEWS.map((v) => {
            const active = !offScreen && sel.kind === "view" && sel.view === v.id;
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
          <button
            onClick={() => select({ kind: "done" })}
            aria-current={doneView && !offScreen ? "page" : undefined}
            className={`flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-left text-[15px] ${
              doneView && !offScreen ? "bg-accent-soft font-bold text-accent-ink" : "font-medium text-muted hover:bg-track hover:text-ink"
            }`}
          >
            <CheckIcon size={18} />
            <span className="flex-1">Completadas</span>
          </button>
        </nav>
        {projectTree}
        {labelList}
        {/* Cuenta con la que se ha entrado y la rueda de Ajustes, abajo del todo. */}
        <div className="mt-auto">
          <AccountCard name={name} email={email} onSettings={() => setSettings(true)} className="bg-bg" />
        </div>
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-32 pt-4 md:px-6 md:pb-16 md:pt-10">
        <div className="mx-auto flex max-w-[720px] flex-col gap-6">
          {/* Barra de arriba del móvil, separada del contenido por una línea. */}
          <div className="-mx-4 -mb-3 -mt-2 flex items-center justify-between border-b border-line px-4 pb-2.5 md:hidden">
            <Logo size={24} />
            <SpaceSwitch space={space} />
          </div>

          {syncError && (
            <p role="alert" className="rounded-xl bg-sunk px-4 py-3 text-sm font-semibold text-danger">
              {syncError}
            </p>
          )}

          {shopping ? (
            <div data-space="compra" className="contents">
              <ShoppingPanel shop={shop} userId={userId} />
            </div>
          ) : more ? (
            <>
              <PageHeader title="Más" />
              {/* Cuenta, con la rueda de Ajustes (tema y cerrar sesión). */}
              <AccountCard name={name} email={email} onSettings={() => setSettings(true)} className="bg-sunk" />
              <nav aria-label="Archivo" className="flex flex-col">
                <button
                  onClick={() => select({ kind: "done" })}
                  className="flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-left text-[15px] font-medium hover:bg-track"
                >
                  <CheckIcon size={18} />
                  <span className="flex-1">Completadas</span>
                </button>
              </nav>
              {projectTree}
              {labelList}
            </>
          ) : (
            <>
            <PageHeader
              title={heading}
              leading={
                project ? (
                  <span className="h-3.5 w-3.5 shrink-0 rounded-full" style={{ background: projectHex(project.color) }} />
                ) : (
                  label && (
                    <span className="shrink-0" style={{ color: projectHex(label.color) }}>
                      <TagIcon size={26} />
                    </span>
                  )
                )
              }
              actions={
                (project && (
                  <button
                    onClick={() => setProjectDialog({ project })}
                    aria-label={`Editar proyecto ${project.name}`}
                    title="Editar proyecto"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
                  >
                    <PencilIcon size={20} />
                  </button>
                )) ||
                (label && (
                  <button
                    onClick={() => setLabelDialog({ label })}
                    aria-label={`Editar etiqueta ${label.name}`}
                    title="Editar etiqueta"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
                  >
                    <PencilIcon size={20} />
                  </button>
                ))
              }
              // La sección ya se ve en el selector: aquí solo va la ruta (Niños › Haru) o «Etiquetas».
              context={[...(label ? ["Etiquetas"] : []), ...ancestors.map((a) => a.name)].join(" › ") || undefined}
              count={
                doneView
                  ? { label: weekDone === 0 ? "Nada esta semana" : `${weekDone} esta semana`, empty: weekDone === 0 }
                  : {
                      label: count === 0 ? "Todo hecho" : count === 1 ? "1 pendiente" : `${count} pendientes`,
                      empty: count === 0,
                    }
              }
              aside={
                eventsToggle && (
                  <button
                    onClick={toggleHideEvents}
                    aria-pressed={!hideEvents}
                    title={hideEvents ? "Mostrar los eventos del calendario" : "Ocultar los eventos del calendario"}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-2 text-sm font-semibold text-muted hover:bg-track hover:text-ink"
                  >
                    <EyeIcon size={15} off={hideEvents} />
                    {hideEvents ? "Mostrar eventos" : "Ocultar eventos"}
                  </button>
                )
              }
            />

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
                    title="Más opciones: descripción, fecha, prioridad, proyecto, etiquetas…"
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
                  >
                    <SlidersIcon />
                  </button>
                  <button
                    type="submit"
                    disabled={!quickTyped.text.trim()}
                    className="min-h-11 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40"
                  >
                    Añadir
                  </button>
                </div>
                {quickDate.detected && <DetectedDateChip detected={quickDate.detected} onIgnore={quickDate.ignore} />}
                <TypedLabels names={quickTyped.names} labels={spaceLabels} />
              </form>
            )}

            {loaded && !doneView && roots.length === 0 && !viewHasEvents && (
              sel.kind === "view" && sel.view !== "inbox" ? (
                <EmptyFilter view={sel.view} />
              ) : sel.kind === "view" ? (
                <EmptyInbox />
              ) : label ? (
                <p className="py-16 text-center text-muted">Ninguna tarea pendiente lleva esta etiqueta.</p>
              ) : (
                <p className="py-16 text-center text-muted">No queda nada pendiente en este proyecto.</p>
              )
            )}

            {loaded && doneView && list.length === 0 && (
              <p className="py-16 text-center text-muted">
                Aún no has completado nada en {spaceLabel}. Lo que completes aparecerá aquí.
              </p>
            )}

            {doneView ? (
              // Completadas, por el día en que se completaron. Desmarcar una la devuelve a su sitio.
              groupByCompletion(list, today).map((g) => (
                <section key={g.label} className="flex flex-col gap-1">
                  <h2 className="text-sm font-bold text-muted first-letter:uppercase">
                    {g.label} · {g.tasks.length}
                  </h2>
                  <ul className="flex flex-col">
                    {g.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        depth={0}
                        today={today}
                        tree={false}
                        childrenOf={childrenOf}
                        context={{ parent: tasks.find((p) => p.id === t.parentId)?.title, project: projectById(t.projectId) }}
                        onToggle={toggle}
                        onEdit={setEditingTask}
                        onRemove={askRemoveTask}
                        onAddSubtask={addSubtask}
                        commentCount={commentCount}
                        onComments={(t) => setCommentsTaskId(t.id)}
                        progressOf={progressOf}
                        labelsOf={labelsOf}
                        spaceLabels={spaceLabels}
                      />
                    ))}
                  </ul>
                </section>
              ))
            ) : dayView ? (
              // Próximo y Próximos (móvil, con Hoy y lo vencido): día a día, eventos y tareas.
              dayGroups.map((g) => (
                <section key={g.key} className="flex flex-col gap-1">
                  <h2 className="text-sm font-bold text-muted first-letter:uppercase">
                    {g.label}
                    {g.tasks.length > 0 && ` · ${g.tasks.length}`}
                  </h2>
                  <EventList events={g.events} day={g.key} />
                  <ul className="flex flex-col">
                    {g.tasks.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        depth={0}
                        tree
                        hideToday={g.key === today}
                        context={flatContext(t)}
                        onToggleShowDone={toggleShowDoneSubtasks}
                        onToggleCollapsed={toggleCollapsed}
                        {...rowProps}
                      />
                    ))}
                  </ul>
                </section>
              ))
            ) : (
              <>
              {/* Hoy: los eventos del día, encima de las tareas. */}
              <EventList events={todayEvents} day={today} />
              <ul className="flex flex-col">
                {roots.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    depth={0}
                    tree={tree}
                    hideToday={sel.kind === "view" && sel.view === "today"}
                    context={tree && !dateView ? undefined : flatContext(t)}
                    onToggleShowDone={toggleShowDoneSubtasks}
                    onToggleCollapsed={toggleCollapsed}
                    {...rowProps}
                  />
                ))}
              </ul>
              </>
            )}

            {/* Lo completado de esta lista se despliega aquí mismo, como las subtareas completadas. */}
            {doneHere > 0 && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => setShowDoneHere((v) => !v)}
                  aria-expanded={showDoneHere}
                  className="inline-flex min-h-11 items-center gap-1.5 self-start rounded-lg px-2 text-sm font-semibold text-muted hover:bg-track hover:text-ink"
                >
                  <EyeIcon size={15} off={!showDoneHere} />
                  {`${showDoneHere ? "Ocultar" : "Mostrar"} ${doneHere === 1 ? "1 completada" : `${doneHere} completadas`}`}
                </button>
                {showDoneHere && (
                  <ul className="flex flex-col">
                    {doneRoots.map((t) => (
                      <TaskRow
                        key={t.id}
                        task={t}
                        depth={0}
                        tree={tree}
                        context={tree ? undefined : flatContext(t)}
                        onToggleShowDone={toggleShowDoneSubtasks}
                    onToggleCollapsed={toggleCollapsed}
                        {...rowProps}
                      />
                    ))}
                  </ul>
                )}
              </div>
            )}
            </>
          )}
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

      {/* Barra inferior: solo móvil. Entrada, Próximos (Hoy + Próximo), Compra y Más. */}
      <nav
        aria-label="Secciones"
        className="fixed inset-x-0 bottom-0 flex gap-1 bg-sunk px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      >
        <BarButton active={inboxActive} onClick={() => select(INBOX)} icon={<ViewIcon view="inbox" size={22} />}>
          Entrada
        </BarButton>
        <BarButton
          active={datesActive}
          onClick={() => select({ kind: "view", view: "agenda" })}
          icon={<ViewIcon view="upcoming" size={22} />}
        >
          Próximos
        </BarButton>
        <div data-space="compra" className="flex flex-1">
          <BarButton active={shopping} tone="accent" onClick={openShopping} icon={<CartIcon size={22} />}>
            Compra
            {shop.pendingCount > 0 && !shopping && (
              <span className="absolute right-1.5 top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1 text-[11px] font-bold text-white">
                {shop.pendingCount}
              </span>
            )}
          </BarButton>
        </div>
        <BarButton active={moreActive} onClick={openMore} icon={<MoreIcon size={22} />}>
          Más
        </BarButton>
      </nav>

      <ShoppingNotice notice={shop.notice} />

      {undo && (
        <div
          role="status"
          className="fixed inset-x-4 bottom-24 z-10 mx-auto flex max-w-sm items-center gap-3 rounded-xl bg-ink py-1.5 pl-4 pr-1.5 text-sm text-bg shadow-lg md:bottom-6"
        >
          <span className="min-w-0 flex-1 truncate">
            <span className="font-semibold">Completada:</span> {undo.title}
          </span>
          <button
            onClick={() => {
              reopen([undo.id]);
              setUndo(null);
            }}
            className="min-h-11 shrink-0 rounded-lg px-3 font-bold text-bg hover:bg-white/10"
          >
            Deshacer
          </button>
        </div>
      )}

      {settings && (
        <Dialog title="Ajustes" onClose={() => setSettings(false)}>
          <NameSettings name={name} onSaved={shop.reload} />
          <section className="flex flex-col gap-2">
            <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted">Tema</h3>
            <ThemeChoice />
          </section>
          <GoogleCalendarsSettings onChange={calendar.reload} />
          {/* La cuenta ya se ve en la tarjeta que abre Ajustes: aquí solo hace falta salir. */}
          <section className="flex flex-col gap-2">
            <button
              onClick={() => {
                setSettings(false);
                setMore(false);
                supabase!.auth.signOut();
              }}
              className="min-h-11 rounded-lg bg-sunk px-4 text-[15px] font-bold text-danger hover:bg-track"
            >
              Cerrar sesión
            </button>
          </section>
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

      {labelDialog && (
        <LabelDialog
          labels={spaceLabels}
          label={labelDialog.label}
          onSave={(l) => (labelDialog.label ? saveLabel(labelDialog.label, l) : createLabel(l))}
          onDelete={labelDialog.label && (() => askRemoveLabel(labelDialog.label!))}
          onClose={() => setLabelDialog(null)}
        />
      )}

      {taskDialog && (
        <TaskDialog
          initial={taskDialog}
          projects={projects}
          labels={spaceLabels}
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
            labels: labelsOf(editingTask.id).map((l) => l.name),
          }}
          projects={projects}
          labels={sortLabels(labels.filter((l) => l.space === editingTask.space))}
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
  onGoTo,
  onRemove,
  onAddSubtask,
  commentCount,
  onComments,
  progressOf,
  onToggleShowDone,
  onToggleCollapsed,
  labelsOf,
  spaceLabels,
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
  // En las agendas no se edita: pulsar la tarea lleva a su proyecto.
  onGoTo?: (t: Task) => void;
  onRemove: (id: string) => void;
  onAddSubtask: (parent: Task, title: string, due?: string, dueTime?: string, labels?: string[]) => void;
  commentCount: (taskId: string) => number;
  onComments: (t: Task) => void;
  progressOf: (id: string) => { done: number; total: number };
  // Solo en árbol: mostrar u ocultar las subtareas completadas de esta tarea.
  onToggleShowDone?: (t: Task) => void;
  // Solo en árbol: plegar o desplegar las subtareas de esta tarea.
  onToggleCollapsed?: (t: Task) => void;
  labelsOf: (taskId: string) => Label[];
  spaceLabels: Label[];
}) {
  const [adding, setAdding] = useState(false);
  // Móvil: hoja con las acciones de la tarea (subtarea, comentarios, borrar).
  const [menu, setMenu] = useState(false);
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
  const subTyped = typedLabels(sub);
  const subDate = useDetectedDate(subTyped.text);
  const overdue = !t.done && isOverdue(t, today);
  const children = tree ? childrenOf(t.id) : [];
  const indent = { paddingLeft: depth * 28 };
  const open = onGoTo ?? onEdit;
  // Solo se añaden subtareas desde el proyecto o Entrada, no desde las agendas.
  const canAddSub = tree && !t.done && !onGoTo;

  function submitSub(e: React.FormEvent) {
    e.preventDefault();
    if (!subTyped.text.trim()) return;
    const d = subDate.detected;
    onAddSubtask(t, d?.title ?? subTyped.text.trim(), d?.due, d?.time, subTyped.names);
    setSub("");
    subDate.reset();
  }

  const showDue = !t.done && !!t.due;
  const onlyTime = showDue && hideToday && t.due === today && !overdue;
  const showPriority = !t.done && t.priority < 4;
  const nComments = commentCount(t.id);
  const taskLabels = labelsOf(t.id);
  const progress = progressOf(t.id);
  // No se puede completar mientras le queden subtareas pendientes.
  const blocked = !t.done && progress.done < progress.total;
  // En árbol, el contador de subtareas pliega y despliega sus subtareas.
  const collapsible = tree && !!onToggleCollapsed && progress.total > 0;
  const collapsed = collapsible && !!t.collapsed;
  const showMeta =
    (showDue && (!onlyTime || !!t.dueTime)) || showPriority || progress.total > 0 || nComments > 0 || taskLabels.length > 0 || !!context;

  return (
    <li className="flex flex-col">
      <div data-task-id={t.id} className="group flex items-start gap-1 border-b border-line py-1.5" style={indent}>
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
        {/* Pulsar la tarea la abre para editarla, o en las agendas lleva a su proyecto (el botón del
            título es el accesible por teclado; el resto de la zona también responde al ratón).
            Desplegar la descripción no hace nada de eso. */}
        <div onClick={() => open(t)} className="flex min-w-0 flex-1 cursor-pointer flex-col gap-0.5 py-2.5">
          <button
            onClick={(e) => {
              e.stopPropagation();
              open(t);
            }}
            aria-label={`${onGoTo ? "Ir a su proyecto" : "Editar"}: ${t.title}`}
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
              {/* De dónde es: proyecto (o Entrada) y, si es una subtarea, su tarea madre. */}
              {context && (
                <span className="inline-flex min-w-0 max-w-full items-center gap-1.5 text-muted">
                  {context.project ? (
                    <>
                      <span
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: projectHex(context.project.color) }}
                      />
                      <span className="shrink-0 whitespace-nowrap">{context.project.name}</span>
                    </>
                  ) : (
                    <>
                      <ViewIcon view="inbox" size={13} />
                      Entrada
                    </>
                  )}
                  {context.parent && (
                    <>
                      <span aria-hidden="true">›</span>
                      <SubtaskIcon size={13} />
                      <span className="min-w-0 truncate">{context.parent}</span>
                    </>
                  )}
                </span>
              )}
              {progress.total > 0 &&
                (collapsible ? (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleCollapsed!(t);
                    }}
                    aria-expanded={!collapsed}
                    aria-label={`${collapsed ? "Desplegar" : "Plegar"} subtareas (${progress.done} de ${progress.total} completadas): ${t.title}`}
                    title={collapsed ? "Desplegar subtareas" : "Plegar subtareas"}
                    className={`-mx-1 inline-flex items-center gap-1 rounded px-1 font-medium hover:bg-track ${
                      progress.done === progress.total ? "text-green" : "text-muted hover:text-ink"
                    }`}
                  >
                    <ProgressPie size={13} value={progress.done / progress.total} />
                    {progress.done}/{progress.total}
                    <ChevronIcon size={12} open={!collapsed} />
                  </button>
                ) : (
                  <span
                    className={`inline-flex items-center gap-1 font-medium ${
                      progress.done === progress.total ? "text-green" : "text-muted"
                    }`}
                    aria-label={`${progress.done} de ${progress.total} subtareas completadas`}
                  >
                    <ProgressPie size={13} value={progress.done / progress.total} />
                    {progress.done}/{progress.total}
                  </span>
                ))}
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
              {taskLabels.map((l) => (
                <LabelTag key={l.id} label={l} />
              ))}
            </div>
          )}
        </div>
        {/* Móvil: un solo botón con las acciones, para dejar todo el ancho al texto. */}
        <button
          onClick={() => setMenu(true)}
          aria-label={`Acciones de: ${t.title}`}
          aria-haspopup="dialog"
          className="grid h-11 w-9 shrink-0 place-items-center text-muted hover:text-ink md:hidden"
        >
          <DotsIcon size={20} />
        </button>
        {/* Escritorio: las acciones aparecen al pasar por encima. Solo las pendientes admiten subtareas. */}
        {canAddSub && (
          <button
            ref={subButton}
            onClick={() => setAdding((a) => !a)}
            aria-label={`Añadir subtarea a: ${t.title}`}
            aria-expanded={adding}
            title="Añadir subtarea"
            className="hidden h-11 w-8 shrink-0 place-items-center text-muted hover:text-ink md:grid md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
          >
            <SubtaskIcon size={18} />
          </button>
        )}
        <button
          onClick={() => onComments(t)}
          aria-label={`Comentarios de: ${t.title}`}
          title="Comentarios"
          className="hidden h-11 w-8 shrink-0 place-items-center text-muted hover:text-ink md:grid md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
        >
          <CommentIcon size={18} />
        </button>
        <button
          onClick={() => onRemove(t.id)}
          aria-label={`Eliminar: ${t.title}`}
          className="hidden h-11 w-8 shrink-0 place-items-center text-muted hover:text-danger md:grid md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
        >
          <TrashIcon size={18} />
        </button>
      </div>

      {menu && (
        <Dialog title={t.title} onClose={() => setMenu(false)}>
          <div className="-mx-2 flex flex-col">
            {canAddSub && (
              <button
                onClick={() => {
                  setMenu(false);
                  setAdding(true);
                }}
                className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-left text-base font-semibold hover:bg-sunk"
              >
                <span className="text-muted">
                  <SubtaskIcon size={20} />
                </span>
                Añadir subtarea
              </button>
            )}
            <button
              onClick={() => {
                setMenu(false);
                onComments(t);
              }}
              className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-left text-base font-semibold hover:bg-sunk"
            >
              <span className="text-muted">
                <CommentIcon size={20} />
              </span>
              Comentarios
              {nComments > 0 && <span className="text-sm font-medium text-muted">{nComments}</span>}
            </button>
            <button
              onClick={() => {
                setMenu(false);
                onRemove(t.id);
              }}
              className="flex min-h-12 items-center gap-3 rounded-lg px-2 text-left text-base font-semibold text-danger hover:bg-sunk"
            >
              <TrashIcon size={20} />
              Borrar
            </button>
          </div>
        </Dialog>
      )}

      {!collapsed && children.length > 0 && (
        <ul className="flex flex-col">
          {children.map((c) => (
            <TaskRow
              key={c.id}
              task={c}
              depth={depth + 1}
              today={today}
              tree={tree}
              hideToday={hideToday}
              childrenOf={childrenOf}
              onToggle={onToggle}
              onEdit={onEdit}
              onGoTo={onGoTo}
              onRemove={onRemove}
              onAddSubtask={onAddSubtask}
              commentCount={commentCount}
              onComments={onComments}
              progressOf={progressOf}
              onToggleShowDone={onToggleShowDone}
              onToggleCollapsed={onToggleCollapsed}
              labelsOf={labelsOf}
              spaceLabels={spaceLabels}
            />
          ))}
        </ul>
      )}

      {tree && !collapsed && onToggleShowDone && progress.done > 0 && (
        <div style={{ paddingLeft: (depth + 1) * 28 + 4 }}>
          <button
            onClick={() => onToggleShowDone(t)}
            aria-pressed={!!t.showDoneSubtasks}
            className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-2 text-[13px] font-semibold text-muted hover:bg-track hover:text-ink"
          >
            <EyeIcon size={14} off={!t.showDoneSubtasks} />
            {!t.showDoneSubtasks
              ? `Mostrar ${progress.done === 1 ? "1 completada" : `${progress.done} completadas`}`
              : `Ocultar ${progress.done === 1 ? "1 completada" : `${progress.done} completadas`}`}
          </button>
        </div>
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
            disabled={!subTyped.text.trim()}
            className="min-h-9 shrink-0 rounded-lg bg-accent px-4 text-sm font-bold text-white disabled:opacity-40"
          >
            Añadir
          </button>
          </div>
          {subDate.detected && <DetectedDateChip detected={subDate.detected} onIgnore={subDate.ignore} />}
          <TypedLabels names={subTyped.names} labels={spaceLabels} />
        </form>
      )}
    </li>
  );
}

// URLs dentro de un texto. Los signos de puntuación del final («mira https://x.com.») no son parte del enlace.
const URL_RE = /\bhttps?:\/\/[^\s<>"]*[^\s<>".,;:!?)\]}'»]/g;
const URL_MAX = 100;

// Texto con las URLs convertidas en enlaces; las muy largas se muestran cortadas con «…» pero enlazan a la URL entera.
function linkify(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(URL_RE)) {
    const url = m[0];
    const start = m.index ?? 0;
    if (start > last) parts.push(text.slice(last, start));
    parts.push(
      <a
        key={start}
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        title={url.length > URL_MAX ? url : undefined}
        onClick={(e) => e.stopPropagation()}
        className="break-all text-accent-ink underline underline-offset-2 hover:no-underline"
      >
        {url.length > URL_MAX ? `${url.slice(0, URL_MAX)}…` : url}
      </a>,
    );
    last = start + url.length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
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
        {linkify(text)}
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
