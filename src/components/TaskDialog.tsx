"use client";

import { useState } from "react";
import { flattenProjects, sameName, typedLabels, type Label, type Priority, type Project, type Space } from "@/lib/tasks";
import DatePicker from "./DatePicker";
import { DetectedDateChip, useDetectedDate } from "./DetectedDate";
import Dialog, { Select, fieldClass, labelClass } from "./Dialog";
import { LabelPicker, TypedLabels } from "./Labels";

export type TaskDraft = {
  space: Space;
  projectId?: string;
  title: string;
  description?: string;
  due?: string;
  dueTime?: string;
  priority: Priority;
  labels: string[]; // nombres; las que no existan se crean al guardar
};

// Formulario completo de una tarea: sirve para crearla y para editarla después.
// Aquí irán entrando las opciones nuevas. La sección no se elige: es la de la tarea.
// Las subtareas siguen el proyecto de su tarea madre, así que en ellas no se cambia.
export default function TaskDialog({
  initial,
  projects,
  labels,
  editing,
  subtask,
  onSave,
  onClose,
}: {
  initial: TaskDraft;
  projects: Project[];
  labels: Label[]; // las de la sección
  editing?: boolean;
  subtask?: boolean;
  onSave: (t: TaskDraft) => void;
  onClose: () => void;
}) {
  const [d, setD] = useState(initial);
  const set = (patch: Partial<TaskDraft>) => setD((prev) => ({ ...prev, ...patch }));
  // La fecha escrita en el texto solo se busca si el texto ha cambiado: al editar una tarea
  // guardada como «Martes de carnaval» no se vuelve a proponer.
  // Las etiquetas escritas con @ salen del texto y se suman a las elegidas.
  const typed = typedLabels(d.title);
  const { detected, ignore } = useDetectedDate(typed.text, d.title !== initial.title);
  const allLabels = [...d.labels, ...typed.names.filter((n) => !d.labels.some((l) => sameName(l, n)))];
  const due = detected?.due ?? d.due;
  const dueTime = due ? (detected?.time ?? d.dueTime) : undefined;

  // Al tocar la fecha o la hora a mano, lo detectado en el texto se da por bueno
  // (sale del texto) y el cambio se aplica encima.
  function setWhen(patch: Pick<TaskDraft, "due" | "dueTime">) {
    set({ ...(detected && { title: detected.title, labels: allLabels }), due, dueTime, ...patch });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!typed.text.trim()) return;
    onSave({
      ...d,
      title: detected?.title ?? typed.text.trim(),
      labels: allLabels,
      description: d.description?.trim() || undefined,
      due: due || undefined,
      dueTime: dueTime || undefined,
    });
    onClose();
  }

  return (
    <Dialog title={editing ? "Editar tarea" : "Nueva tarea"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Tarea
            <input value={d.title} onChange={(e) => set({ title: e.target.value })} className={fieldClass} />
          </label>
          {detected && <DetectedDateChip detected={detected} onIgnore={ignore} />}
          <TypedLabels names={typed.names} labels={labels} />
        </div>
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
          <div className={`${labelClass} col-span-2`}>
            <span aria-hidden="true">Fecha</span>
            <DatePicker value={due} time={dueTime} onChange={(v) => setWhen({ due: v.due, dueTime: v.time })} />
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
            <label className={labelClass}>
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

        <div className={labelClass}>
          <span aria-hidden="true">Etiquetas</span>
          <LabelPicker
            labels={labels}
            value={d.labels}
            onChange={(names) => set({ labels: names })}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-ink-soft hover:bg-track">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!typed.text.trim()}
            className="min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {editing ? "Guardar" : "Añadir tarea"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
