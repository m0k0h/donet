"use client";

import { useState } from "react";
import { descendantProjectIds, flattenProjects, type Project, type Space } from "@/lib/tasks";
import ColorPicker from "./ColorPicker";
import Dialog, { Select, fieldClass, labelClass } from "./Dialog";

// Crear un proyecto (solo hace falta el nombre; color y proyecto padre son opcionales)
// o editar uno existente, que además se puede borrar.
export default function ProjectDialog({
  space,
  projects,
  parentId: initialParent,
  project,
  onSave,
  onDelete,
  onClose,
}: {
  space: Space;
  projects: Project[];
  parentId?: string;
  project?: Project; // si viene, se está editando
  onSave: (p: { name: string; color: string; parentId?: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(project?.name ?? "");
  const [color, setColor] = useState(project?.color ?? "gray");
  const [parentId, setParentId] = useState(project ? (project.parentId ?? "") : (initialParent ?? ""));

  // Un proyecto no puede ir dentro de sí mismo ni de uno de sus subproyectos.
  const excluded = new Set(project ? [project.id, ...descendantProjectIds(projects, project.id)] : []);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({ name: name.trim(), color, parentId: parentId || undefined });
    onClose();
  }

  // La confirmación la pide quien abre este formulario.
  function remove() {
    onClose();
    onDelete?.();
  }

  return (
    <Dialog title={project ? "Editar proyecto" : "Nuevo proyecto"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </label>

        <ColorPicker value={color} onChange={setColor} />

        <label className={labelClass}>
          Dentro de
          <Select value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">Ninguno (primer nivel)</option>
            {flattenProjects(projects, space)
              .filter(({ project: p }) => !excluded.has(p.id))
              .map(({ project: p, depth }) => (
                <option key={p.id} value={p.id}>
                  {"   ".repeat(depth) + p.name}
                </option>
              ))}
          </Select>
        </label>

        <div className="flex items-center justify-end gap-2 pt-1">
          {project && onDelete && (
            <button
              type="button"
              onClick={remove}
              className="mr-auto min-h-11 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-track"
            >
              Borrar proyecto
            </button>
          )}
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-ink-soft hover:bg-track">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {project ? "Guardar" : "Crear proyecto"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
