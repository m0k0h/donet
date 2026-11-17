"use client";

import { useState } from "react";
import { childProjects, projectHex, type Project, type Space } from "@/lib/tasks";
import { ChevronIcon, PlusIcon } from "./icons";

// Árbol de proyectos de la sección. Cada proyecto se puede plegar si tiene hijos
// y tiene un botón para crear un subproyecto dentro.
export default function ProjectTree({
  space,
  projects,
  selectedId,
  pendingOf,
  onSelect,
  onAdd,
}: {
  space: Space;
  projects: Project[];
  selectedId?: string;
  pendingOf: (id: string) => number;
  onSelect: (id: string) => void;
  onAdd: (parentId?: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  function branch(parentId: string | undefined, depth: number) {
    const list = childProjects(projects, space, parentId);
    if (!list.length) return null;
    return (
      <ul role={depth ? "group" : undefined} className="flex flex-col gap-0.5">
        {list.map((p) => {
          const hasChildren = projects.some((c) => c.parentId === p.id);
          const open = !collapsed.has(p.id);
          const active = selectedId === p.id;
          const pending = pendingOf(p.id);
          return (
            <li key={p.id}>
              <div
                className={`group/row flex min-h-11 items-center rounded-lg ${
                  active ? "bg-accent-soft text-accent-ink" : "hover:bg-track"
                }`}
                style={{ paddingLeft: depth * 14 }}
              >
                {hasChildren ? (
                  <button
                    onClick={() => toggle(p.id)}
                    aria-label={`${open ? "Plegar" : "Desplegar"} ${p.name}`}
                    aria-expanded={open}
                    className="grid h-11 w-7 shrink-0 place-items-center text-muted"
                  >
                    <ChevronIcon size={16} open={open} />
                  </button>
                ) : (
                  <span className="w-7 shrink-0" />
                )}
                <button
                  onClick={() => onSelect(p.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 min-w-0 flex-1 items-center gap-2.5 pr-1 text-left text-[15px] ${
                    active ? "font-bold" : "font-medium"
                  }`}
                >
                  <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: projectHex(p.color) }} />
                  <span className="truncate">{p.name}</span>
                </button>
                <span className={`min-w-10 shrink-0 pl-2 pr-3.5 text-right text-[13px] group-hover/row:hidden group-has-[:focus-visible]/row:hidden ${active ? "" : "text-muted"}`}>
                  {pending || ""}
                </span>
                <button
                  onClick={() => onAdd(p.id)}
                  aria-label={`Nuevo proyecto dentro de ${p.name}`}
                  title="Nuevo subproyecto"
                  className="hidden h-11 w-11 shrink-0 place-items-center rounded-lg text-muted hover:text-ink group-hover/row:grid group-has-[:focus-visible]/row:grid"
                >
                  <PlusIcon size={16} />
                </button>
              </div>
              {open && branch(p.id, depth + 1)}
            </li>
          );
        })}
      </ul>
    );
  }

  return (
    <section aria-label="Proyectos" className="flex flex-col gap-1">
      <div className="flex items-center justify-between pl-3.5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">Proyectos</h2>
        <button
          onClick={() => onAdd()}
          aria-label="Nuevo proyecto"
          title="Nuevo proyecto"
          className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
        >
          <PlusIcon size={18} />
        </button>
      </div>
      {branch(undefined, 0) ?? <p className="px-3.5 text-sm text-muted">Aún no hay proyectos.</p>}
    </section>
  );
}
