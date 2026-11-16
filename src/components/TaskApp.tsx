"use client";

import { useEffect, useState } from "react";
import {
  VIEWS,
  filterTasks,
  loadTasks,
  saveTasks,
  todayISO,
  type Priority,
  type Task,
  type View,
} from "@/lib/tasks";

const PRIORITY_RING: Record<Priority, string> = {
  1: "border-red-500",
  2: "border-orange-400",
  3: "border-blue-500",
  4: "border-neutral-400",
};

export default function TaskApp() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [view, setView] = useState<View>("inbox");
  const [title, setTitle] = useState("");
  const [due, setDue] = useState("");
  const [priority, setPriority] = useState<Priority>(4);

  useEffect(() => {
    setTasks(loadTasks());
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded) saveTasks(tasks);
  }, [tasks, loaded]);

  const visible = filterTasks(tasks, view);
  const pending = (v: View) => filterTasks(tasks, v).filter((t) => !t.done).length;
  const current = VIEWS.find((v) => v.id === view)!;

  function addTask(e: React.FormEvent) {
    e.preventDefault();
    const t = title.trim();
    if (!t) return;
    setTasks((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        title: t,
        done: false,
        priority,
        due: due || (view === "today" ? todayISO() : undefined),
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
    <div className="flex min-h-dvh">
      {/* Barra lateral: solo escritorio */}
      <aside className="hidden md:flex w-64 shrink-0 flex-col gap-1 border-r border-black/10 dark:border-white/10 bg-neutral-50 dark:bg-neutral-900 p-4">
        <h1 className="mb-4 px-2 text-xl font-bold">
          doneT <span aria-hidden>🍩</span>
        </h1>
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${
              view === v.id
                ? "bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100"
                : "hover:bg-black/5 dark:hover:bg-white/5"
            }`}
          >
            <span aria-hidden>{v.icon}</span>
            <span className="flex-1">{v.label}</span>
            <span className="text-xs opacity-60">{pending(v.id) || ""}</span>
          </button>
        ))}
      </aside>

      <main className="flex-1 min-w-0 px-4 pt-6 pb-28 md:px-10 md:pb-10">
        <div className="mx-auto max-w-2xl">
          <header className="mb-6 flex items-baseline justify-between">
            <h2 className="text-2xl font-bold">{current.label}</h2>
            <span className="md:hidden text-lg font-bold">doneT 🍩</span>
          </header>

          <form onSubmit={addTask} className="mb-6 rounded-xl border border-black/10 dark:border-white/15 p-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Añadir tarea…"
              aria-label="Nombre de la tarea"
              className="w-full bg-transparent text-base outline-none placeholder:opacity-50"
            />
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input
                type="date"
                value={due}
                onChange={(e) => setDue(e.target.value)}
                aria-label="Fecha"
                className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm"
              />
              <select
                value={priority}
                onChange={(e) => setPriority(Number(e.target.value) as Priority)}
                aria-label="Prioridad"
                className="rounded-md border border-black/10 dark:border-white/15 bg-transparent px-2 py-1 text-sm"
              >
                <option value={1}>P1</option>
                <option value={2}>P2</option>
                <option value={3}>P3</option>
                <option value={4}>P4</option>
              </select>
              <button
                type="submit"
                disabled={!title.trim()}
                className="ml-auto rounded-md bg-amber-500 px-4 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Añadir
              </button>
            </div>
          </form>

          {loaded && visible.length === 0 && (
            <p className="py-16 text-center opacity-60">Nada por aquí. ¡Te has ganado un donete! 🍩</p>
          )}

          <ul className="divide-y divide-black/5 dark:divide-white/10">
            {visible.map((t) => (
              <li key={t.id} className="group flex items-start gap-3 py-3">
                <button
                  onClick={() => toggle(t.id)}
                  aria-label={t.done ? "Marcar como pendiente" : "Completar tarea"}
                  className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border-2 text-xs ${PRIORITY_RING[t.priority]} ${
                    t.done ? "bg-neutral-400 border-neutral-400 text-white" : ""
                  }`}
                >
                  {t.done ? "✓" : ""}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`break-words ${t.done ? "line-through opacity-50" : ""}`}>{t.title}</p>
                  {t.due && (
                    <p className={`text-xs ${!t.done && t.due < todayISO() ? "text-red-500" : "opacity-60"}`}>
                      {new Date(t.due + "T00:00").toLocaleDateString("es-ES", {
                        weekday: "short",
                        day: "numeric",
                        month: "short",
                      })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  aria-label="Eliminar tarea"
                  className="p-1 opacity-50 hover:opacity-100 md:opacity-0 md:group-hover:opacity-60"
                >
                  🗑️
                </button>
              </li>
            ))}
          </ul>
        </div>
      </main>

      {/* Navegación inferior: solo móvil */}
      <nav className="md:hidden fixed inset-x-0 bottom-0 flex border-t border-black/10 dark:border-white/10 bg-white/95 dark:bg-neutral-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)]">
        {VIEWS.map((v) => (
          <button
            key={v.id}
            onClick={() => setView(v.id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-xs ${
              view === v.id ? "text-amber-600 font-semibold" : "opacity-70"
            }`}
          >
            <span className="text-xl" aria-hidden>{v.icon}</span>
            {v.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
