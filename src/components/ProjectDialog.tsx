"use client";

import { useState } from "react";
import { PROJECT_COLORS, flattenProjects, type Project, type Space } from "@/lib/tasks";
import Dialog, { fieldClass, labelClass } from "./Dialog";
import { CheckIcon } from "./icons";

// Crear un proyecto: solo hace falta el nombre. El color y el proyecto padre son opcionales.
export default function ProjectDialog({
  space,
  projects,
  parentId: initialParent,
  onCreate,
  onClose,
}: {
  space: Space;
  projects: Project[];
  parentId?: string;
  onCreate: (p: { name: string; color: string; parentId?: string }) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("gray");
  const [parentId, setParentId] = useState(initialParent ?? "");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate({ name: name.trim(), color, parentId: parentId || undefined });
    onClose();
  }

  return (
    <Dialog title="Nuevo proyecto" onClose={onClose}>
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
          <select value={parentId} onChange={(e) => setParentId(e.target.value)} className={fieldClass}>
            <option value="">Ninguno (primer nivel)</option>
            {flattenProjects(projects, space).map(({ project, depth }) => (
              <option key={project.id} value={project.id}>
                {"   ".repeat(depth) + project.name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-ink-soft hover:bg-track">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!name.trim()}
            className="min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            Crear proyecto
          </button>
        </div>
      </form>
    </Dialog>
  );
}
