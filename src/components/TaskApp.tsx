"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  SPACES,
  VIEWS,
  filterTasks,
  loadLegacyTasks,
  localTasksUploaded,
  markLocalTasksUploaded,
  saveSpace,
  spacePath,
  todayISO,
  type Priority,
  type Space,
  type Task,
  type View,
} from "@/lib/tasks";
import { deleteTask, fetchTasks, insertTasks, setTaskDone, supabase } from "@/lib/supabase";
import AuthScreen from "./AuthScreen";
import Logo from "./Logo";
import SetupScreen from "./SetupScreen";
import ThemeToggle from "./ThemeToggle";
import { CheckIcon, PlusIcon, SpaceIcon, SwapIcon, TrashIcon, ViewIcon } from "./icons";

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

function Tasks({ space }: { space: Space }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>("inbox");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>(4);
  const [composerOpen, setComposerOpen] = useState(false);
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
        const remote = await fetchTasks();
        if (cancelled) return;
        setTasks(remote);
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
        setTasks(await fetchTasks());
      } catch {}
    });
  }

  const today = todayISO();
  const visible = filterTasks(tasks, space, view);
  const pending = (v: View) => filterTasks(tasks, space, v).filter((t) => !t.done).length;
  const current = VIEWS.find((v) => v.id === view)!;
  const spaceLabel = SPACES.find((s) => s.id === space)!.label;
  const count = pending(view);

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    const task: Task = {
      id: crypto.randomUUID(),
      space,
      title: t,
      done: false,
      priority,
      due: due || (view === "today" ? today : undefined),
      createdAt: Date.now(),
    };
    setTasks((prev) => [...prev, task]);
    sync(insertTasks([task]));
    setTitle("");
    setDue("");
    setPriority(4);
  }

  function toggle(task: Task) {
    setTasks((prev) => prev.map((t) => (t.id === task.id ? { ...t, done: !task.done } : t)));
    sync(setTaskDone(task.id, !task.done));
  }
  function remove(id: string) {
    setTasks((prev) => prev.filter((t) => t.id !== id));
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

  return (
    <div data-space={space} className="flex min-h-dvh">
      {/* Barra lateral: solo escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-sunk px-4 py-6 md:flex">
        <div className="pl-2">
          <Logo size={28} surface="var(--sunk)" />
        </div>
        <SpaceSwitch space={space} showLabel />
        <nav aria-label="Vistas" className="flex flex-col gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-current={view === v.id ? "page" : undefined}
              className={`flex min-h-11 items-center gap-3 rounded-lg px-3.5 text-left text-[15px] ${
                view === v.id ? "bg-accent-soft font-bold text-accent-ink" : "font-medium hover:bg-track"
              }`}
            >
              <ViewIcon view={v.id} />
              <span className="flex-1">{v.label}</span>
              <span className={`text-[13px] ${view === v.id ? "" : "text-muted"}`}>{pending(v.id) || ""}</span>
            </button>
          ))}
        </nav>
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
            <h1 className="text-[30px] font-extrabold leading-tight tracking-[-0.02em] md:text-[34px]">
              {current.label}
            </h1>
            <p className="text-sm text-muted">
              {spaceLabel} · {count === 1 ? "1 tarea pendiente" : `${count} tareas pendientes`}
            </p>
          </header>

          <form
            onSubmit={addTask}
            className={`${composerOpen ? "flex" : "hidden"} flex-col gap-3 rounded-xl bg-sunk p-4 md:flex`}
          >
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Añadir tarea…"
              aria-label="Nombre de la tarea"
              autoFocus={composerOpen}
              className="w-full bg-transparent py-1 text-base outline-none placeholder:text-muted"
            />
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                aria-label="Fecha"
                className="min-h-9 rounded-lg bg-bg px-3.5 text-sm font-medium text-ink-soft"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as Priority)}
                aria-label="Prioridad"
                className="min-h-9 rounded-lg bg-bg px-3.5 text-sm font-medium text-ink-soft"
              >
                <option value={1}>Prioridad 1</option>
                <option value={2}>Prioridad 2</option>
                <option value={3}>Prioridad 3</option>
                <option value={4}>Sin prioridad</option>
              </select>
              <button
                type="submit"
                disabled={!title.trim()}
                className="ml-auto min-h-9 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40"
              >
                Añadir tarea
              </button>
            </div>
          </form>

          {loaded && visible.length === 0 && (
            <p className="py-16 text-center text-muted">Nada por aquí. ¡Te has ganado un donete!</p>
          )}

          <ul className="flex flex-col">
            {visible.map((t) => {
              const overdue = !t.done && !!t.due && t.due < today;
              return (
                <li key={t.id} className="group flex items-start gap-1 border-b border-line py-1.5 last:border-b-0">
                  <button
                    onClick={() => toggle(t)}
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
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5 py-2.5">
                    <span className={`break-words ${t.done ? "text-muted line-through" : ""}`}>{t.title}</span>
                    {t.done ? (
                      <span className="text-[13px] font-semibold text-green">Hecha</span>
                    ) : (
                      <span className={`text-[13px] ${overdue ? "font-semibold text-danger" : "text-muted"}`}>
                        {dueLabel(t.due, today)}
                        {t.priority < 4 && ` · P${t.priority}`}
                      </span>
                    )}
                  </div>
                  <button
                    onClick={() => remove(t.id)}
                    aria-label={`Eliminar: ${t.title}`}
                    className="grid h-11 w-11 shrink-0 place-items-center text-muted hover:text-danger md:opacity-0 md:focus-visible:opacity-100 md:group-hover:opacity-100"
                  >
                    <TrashIcon size={18} />
                  </button>
                </li>
              );
            })}
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

      {/* Barra inferior: solo móvil. Vistas a la izquierda, tema a la derecha. */}
      <div className="fixed inset-x-0 bottom-0 flex items-center gap-1 bg-sunk px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <nav aria-label="Vistas" className="flex flex-1 gap-1">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              onClick={() => setView(v.id)}
              aria-current={view === v.id ? "page" : undefined}
              className={`flex min-h-[52px] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg text-xs ${
                view === v.id ? "bg-accent-soft font-bold text-accent-ink" : "font-semibold text-muted"
              }`}
            >
              <ViewIcon view={v.id} size={22} />
              {v.label}
            </button>
          ))}
        </nav>
        <ThemeToggle />
      </div>
    </div>
  );
}
