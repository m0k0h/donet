"use client";

import { useState } from "react";
import { projectHex, sameName, type Label } from "@/lib/tasks";
import { fieldClass } from "./Dialog";
import { PlusIcon, TagIcon } from "./icons";

const findLabel = (labels: Label[], name: string) => labels.find((l) => sameName(l.name, name));

// Etiqueta en la fila de una tarea.
export function LabelTag({ label }: { label: Label }) {
  return (
    <span className="inline-flex min-w-0 items-center gap-1 font-medium text-muted">
      <span className="shrink-0" style={{ color: projectHex(label.color) }}>
        <TagIcon size={13} />
      </span>
      <span className="truncate">{label.name}</span>
    </span>
  );
}

// Aviso bajo un campo de texto: qué etiquetas se han escrito con @ y cuáles se crearán.
export function TypedLabels({ names, labels }: { names: string[]; labels: Label[] }) {
  if (!names.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1 text-[13px]" aria-live="polite">
      {names.map((n) => {
        const existing = findLabel(labels, n);
        return (
          <span
            key={n.toLowerCase()}
            className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft py-1 pl-2 pr-2.5 font-semibold text-accent-ink"
          >
            <span style={{ color: existing ? projectHex(existing.color) : undefined }}>
              <TagIcon size={14} />
            </span>
            {existing?.name ?? n}
            {!existing && <span className="font-medium opacity-70">· nueva</span>}
          </span>
        );
      })}
    </div>
  );
}

// Elegir las etiquetas de una tarea en su formulario: las de la sección se encienden y
// apagan, y se puede escribir una nueva (se crea al guardar la tarea).
export function LabelPicker({
  labels,
  value,
  onChange,
}: {
  labels: Label[];
  value: string[]; // nombres
  onChange: (names: string[]) => void;
}) {
  const [draft, setDraft] = useState("");
  const has = (name: string) => value.some((v) => sameName(v, name));
  const toggle = (name: string) => onChange(has(name) ? value.filter((v) => !sameName(v, name)) : [...value, name]);
  // Las nuevas (aún sin crear) también se muestran, para poder quitarlas.
  const options = [...labels.map((l) => ({ name: l.name, label: l as Label | undefined })), ...value.filter((v) => !findLabel(labels, v)).map((name) => ({ name, label: undefined }))];

  function add() {
    const name = draft.trim().replace(/^@+/, "").replace(/\s+/g, "-");
    if (!name) return;
    const existing = findLabel(labels, name)?.name ?? name;
    if (!has(existing)) onChange([...value, existing]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-2">
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {options.map(({ name, label }) => {
            const on = has(name);
            return (
              <button
                key={name.toLowerCase()}
                type="button"
                onClick={() => toggle(name)}
                aria-pressed={on}
                className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-semibold ${
                  on ? "border-accent bg-accent-soft text-accent-ink" : "border-ring/60 text-ink-soft hover:border-ring"
                }`}
              >
                <span style={{ color: label ? projectHex(label.color) : undefined }}>
                  <TagIcon size={14} />
                </span>
                {name}
                {!label && <span className="font-medium opacity-70">· nueva</span>}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            add();
          }}
          placeholder="Nueva etiqueta…"
          aria-label="Nueva etiqueta"
          className={fieldClass}
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          aria-label="Añadir etiqueta"
          className="grid h-11 w-11 shrink-0 place-items-center rounded-lg bg-track text-ink-soft hover:text-ink disabled:opacity-40"
        >
          <PlusIcon size={18} />
        </button>
      </div>
    </div>
  );
}

// Lista de etiquetas de la sección en la barra lateral.
export function LabelList({
  labels,
  selectedId,
  pendingOf,
  onSelect,
  onAdd,
}: {
  labels: Label[];
  selectedId?: string;
  pendingOf: (id: string) => number;
  onSelect: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <section aria-label="Etiquetas" className="flex flex-col gap-1">
      <div className="flex items-center justify-between pl-3.5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-muted">Etiquetas</h2>
        <button
          onClick={onAdd}
          aria-label="Nueva etiqueta"
          title="Nueva etiqueta"
          className="grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink"
        >
          <PlusIcon size={18} />
        </button>
      </div>
      {labels.length ? (
        <ul className="flex flex-col gap-0.5">
          {labels.map((l) => {
            const active = selectedId === l.id;
            const pending = pendingOf(l.id);
            return (
              <li key={l.id}>
                <button
                  onClick={() => onSelect(l.id)}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-11 w-full items-center gap-2.5 rounded-lg pl-3.5 pr-3.5 text-left text-[15px] ${
                    active ? "bg-accent-soft font-bold text-accent-ink" : "font-medium hover:bg-track"
                  }`}
                >
                  <span className="shrink-0" style={{ color: projectHex(l.color) }}>
                    <TagIcon size={16} />
                  </span>
                  <span className="min-w-0 flex-1 truncate">{l.name}</span>
                  <span className={`text-[13px] ${active ? "" : "text-muted"}`}>{pending || ""}</span>
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="px-3.5 text-sm text-muted">Escribe @nombre en una tarea para crear una.</p>
      )}
    </section>
  );
}
