"use client";

import { useEffect, useState } from "react";
import {
  SPACES,
  VIEWS,
  filterTasks,
  loadSpace,
  loadTasks,
  saveSpace,
  saveTasks,
  todayISO,
  type Priority,
  type Space,
  type Task,
  type View,
} from "@/lib/tasks";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { CheckIcon, PlusIcon, SpaceIcon, TrashIcon, ViewIcon } from "./icons";

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

function SpaceSwitch({ space, onChange, compact }: { space: Space; onChange: (s: Space) => void; compact?: boolean }) {
  return (
    <div role="tablist" aria-label="Espacio" className="flex gap-1 rounded-[10px] bg-track p-1">
      {SPACES.map((s) => (
        <button
          key={s.id}
          role="tab"
          aria-selected={space === s.id}
          onClick={() => onChange(s.id)}
          className={`flex min-h-11 flex-1 items-center justify-center gap-2 whitespace-nowrap rounded-[7px] text-sm ${
            compact ? "px-3.5" : "px-3"
          } ${space === s.id ? "bg-accent font-bold text-white" : "font-semibold text-ink-soft"}`}
        >
          <SpaceIcon space={s.id} size={compact ? 16 : 18} />
          {s.label}
        </button>
      ))}
    </div>
  );
}

export default function TaskApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [space, setSpace] = useState<Space>("personal");
  const [view, setView] = useState<View>("inbox");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>(4);
  const [composerOpen, setComposerOpen] = useState(false);

  useEffect(() => {
    setTasks(loadTasks());
    setSpace(loadSpace());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveTasks(tasks);
  }, [tasks, loaded]);

  const changeSpace = (s: Space) => {
    setSpace(s);
    saveSpace(s);
  };
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
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        space,
        title: t,
        done: false,
        priority,
        due: due || (view === "today" ? today : undefined),
        createdAt: Date.now(),
      },
    ]);
    setTitle("");
    setDue("");
    setPriority(4);
  }

  const toggle = (id: string) =>
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: string) => setTasks((prev) => prev.filter((t) => t.id !== id));

  return (
    <div data-space={space} className="flex min-h-dvh">
      {/* Barra lateral: solo escritorio */}
      <aside className="hidden w-64 shrink-0 flex-col gap-6 bg-sunk px-4 py-6 md:flex">
        <div className="flex items-center justify-between pl-2">
          <Logo size={28} surface="var(--sunk)" />
          <ThemeToggle />
        </div>
        <SpaceSwitch space={space} onChange={changeSpace} />
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
      </aside>

      <main className="min-w-0 flex-1 px-4 pb-32 pt-4 md:px-6 md:pb-16 md:pt-10">
        <div className="mx-auto flex max-w-[720px] flex-col gap-6">
          <div className="flex items-center gap-1 md:hidden">
            <Logo size={24} />
            <div className="ml-auto">
              <SpaceSwitch space={space} onChange={changeSpace} compact />
            </div>
            <ThemeToggle />
          </div>

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
                className="min-h-11 rounded-lg bg-bg px-3.5 text-sm font-medium text-ink-soft"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as Priority)}
                aria-label="Prioridad"
                className="min-h-11 rounded-lg bg-bg px-3.5 text-sm font-medium text-ink-soft"
              >
                <option value={1}>Prioridad 1</option>
                <option value={2}>Prioridad 2</option>
                <option value={3}>Prioridad 3</option>
                <option value={4}>Sin prioridad</option>
              </select>
              <button
                type="submit"
                disabled={!title.trim()}
                className="ml-auto min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40"
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
                    onClick={() => toggle(t.id)}
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

      {/* Navegación inferior: solo móvil */}
      <nav
        aria-label="Vistas"
        className="fixed inset-x-0 bottom-0 flex gap-1 bg-sunk px-2 pt-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden"
      >
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
    </div>
  );
}
