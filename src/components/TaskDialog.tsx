"use client";

import { useState } from "react";
import { flattenProjects, type Priority, type Project, type Space } from "@/lib/tasks";
import DatePicker from "./DatePicker";
import Dialog, { Select, fieldClass, labelClass } from "./Dialog";

export type TaskDraft = {
  space: Space;
  projectId?: string;
  title: string;
  description?: string;
  due?: string;
  priority: Priority;
};

// Formulario completo de una tarea: sirve para crearla y para editarla después.
// Aquí irán entrando las opciones nuevas. La sección no se elige: es la de la tarea.
// Las subtareas siguen el proyecto de su tarea madre, así que en ellas no se cambia.
export default function TaskDialog({
  initial,
  projects,
  editing,
  subtask,
  onSave,
  onClose,
}: {
  initial: TaskDraft;
  projects: Project[];
  editing?: boolean;
  subtask?: boolean;
  onSave: (t: TaskDraft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(initial);
  const set = (patch: Partial<TaskDraft>) => setD((prev) => ({ ...prev, ...patch }));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!d.title.trim()) return;
    onSave({ ...d, title: d.title.trim(), description: d.description?.trim() || undefined, due: d.due || undefined });
    onClose();
  }

  return (
    <Dialog title={editing ? "Editar tarea" : "Nueva tarea"} onClose={onClose}>
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
          <div className={labelClass}>
            <span aria-hidden="true">Fecha</span>
            <DatePicker value={d.due} onChange={(due) => set({ due })} />
          </div>
          <label className={labelClass}>
            Prioridad
            <Select value={d.priority} onChange={(e) => set({ priority: Number(e.target.value) as Priority })}>
              <option value={1}>Prioridad 1</option>
              <option value={2}>Prioridad 2</option>
              <option value={3}>Prioridad 3</option>
              <option value={4}>Sin prioridad</option>
            </Select>
          </label>
          {!subtask && (
            <label className={`${labelClass} col-span-2`}>
              Proyecto
              <Select value={d.projectId ?? ""} onChange={(e) => set({ projectId: e.target.value || undefined })}>
                <option value="">Entrada</option>
                {flattenProjects(projects, d.space).map(({ project, depth }) => (
                  <option key={project.id} value={project.id}>
                    {"\u00a0\u00a0\u00a0".repeat(depth) + project.name}
                  </option>
                ))}
              </Select>
            </label>
          )}
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
            {editing ? "Guardar" : "Añadir tarea"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
