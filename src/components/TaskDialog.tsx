"use client";

import { useState } from "react";
import { SPACES, flattenProjects, type Priority, type Project, type Space } from "@/lib/tasks";
import Dialog, { fieldClass, labelClass } from "./Dialog";

export type TaskDraft = {
  space: Space;
  projectId?: string;
  title: string;
  description?: string;
  due?: string;
  priority: Priority;
};

// Modo completo de crear una tarea. Aquí irán entrando las opciones nuevas.
export default function TaskDialog({
  initial,
  projects,
  onCreate,
  onClose,
}: {
  initial: TaskDraft;
  projects: Project[];
  onCreate: (t: TaskDraft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(initial);
  const set = (patch: Partial<TaskDraft>) => setD((prev) => ({ ...prev, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) return;
    onCreate({ ...d, title: d.title.trim(), description: d.description?.trim() || undefined, due: d.due || undefined });
    onClose();
  }

  return (
    <Dialog title="Nueva tarea" onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Tarea
          <input value={d.title} onChange={(e) => set({ title: e.target.value })} className={fieldClass} />
        </label>
        <label className={labelClass}>
          Descripción
          <textarea
            value={d.description ?? ""}
            onChange={(e) => set({ description: e.target.value })}
            rows={3}
            className={`${fieldClass} resize-y py-2.5`}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className={labelClass}>
            Fecha
            <input type="date" value={d.due ?? ""} onChange={(e) => set({ due: e.target.value })} className={fieldClass} />
          </label>
          <label className={labelClass}>
            Prioridad
            <select
              value={d.priority}
              onChange={(e) => set({ priority: Number(e.target.value) as Priority })}
              className={fieldClass}
            >
              <option value={1}>Prioridad 1</option>
              <option value={2}>Prioridad 2</option>
              <option value={3}>Prioridad 3</option>
              <option value={4}>Sin prioridad</option>
            </select>
          </label>
          <label className={labelClass}>
            Sección
            {/* Al cambiar de sección, el proyecto vuelve a Entrada: los proyectos son de cada sección. */}
            <select
              value={d.space}
              onChange={(e) => set({ space: e.target.value as Space, projectId: undefined })}
              className={fieldClass}
            >
              {SPACES.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          <label className={labelClass}>
            Proyecto
            <select
              value={d.projectId ?? ""}
              onChange={(e) => set({ projectId: e.target.value || undefined })}
              className={fieldClass}
            >
              <option value="">Entrada</option>
              {flattenProjects(projects, d.space).map(({ project, depth }) => (
                <option key={project.id} value={project.id}>
                  {"   ".repeat(depth) + project.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-ink-soft hover:bg-track">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!d.title.trim()}
            className="min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            Añadir tarea
          </button>
        </div>
      </form>
    </Dialog>
  );
}
