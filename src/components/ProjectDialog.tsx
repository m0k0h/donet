"use client";

import { useState } from "react";
import { PROJECT_COLORS, descendantProjectIds, flattenProjects, type Project, type Space } from "@/lib/tasks";
import Dialog, { Select, fieldClass, labelClass } from "./Dialog";
import { CheckIcon } from "./icons";

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

  function remove() {
    if (!project || !onDelete) return;
    const ok = window.confirm(
      `¿Borrar «${project.name}»? Se borrarán también sus subproyectos y todas sus tareas. No se puede deshacer.`,
    );
    if (!ok) return;
    onDelete();
    onClose();
  }

  return (
    <Dialog title={project ? "Editar proyecto" : "Nuevo proyecto"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className={labelClass}>
          Nombre
          <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
        </label>

        <fieldset className="flex flex-col gap-1.5">
          <legend className="mb-1.5 text-sm font-semibold text-ink-soft">Color</legend>
          <div className="flex flex-wrap gap-1">
            {PROJECT_COLORS.map((c) => (
              <label key={c.id} title={c.label} className="grid h-11 w-11 cursor-pointer place-items-center">
                <input
                  type="radio"
                  name="color"
                  value={c.id}
                  checked={color === c.id}
                  onChange={() => setColor(c.id)}
                  aria-label={c.label}
                  className="peer sr-only"
                />
                <span
                  className="grid h-7 w-7 place-items-center rounded-full text-white ring-offset-2 ring-offset-bg peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink"
                  style={{ background: c.hex }}
                >
                  {color === c.id && <CheckIcon size={14} />}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

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
