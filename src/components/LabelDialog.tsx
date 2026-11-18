"use client";

import { useState } from "react";
import { sameName, type Label } from "@/lib/tasks";
import ColorPicker from "./ColorPicker";
import Dialog, { fieldClass, labelClass } from "./Dialog";

// Crear una etiqueta o editar una existente, que además se puede borrar.
// El nombre no puede repetirse dentro de la sección.
export default function LabelDialog({
  labels,
  label,
  onSave,
  onDelete,
  onClose,
}: {
  labels: Label[]; // las de la sección, para no repetir nombre
  label?: Label; // si viene, se está editando
  onSave: (l: { name: string; color: string }) => void;
  onDelete?: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(label?.name ?? "");
  const [color, setColor] = useState(label?.color ?? "gray");
  // Sin espacios ni @: así se puede escribir luego con @nombre.
  const clean = name.trim().replace(/^@+/, "").replace(/\s+/g, "-");
  const taken = labels.some((l) => l.id !== label?.id && sameName(l.name, clean));

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!clean || taken) return;
    onSave({ name: clean, color });
    onClose();
  }

  // La confirmación la pide quien abre este formulario.
  function remove() {
    onClose();
    onDelete?.();
  }

  return (
    <Dialog title={label ? "Editar etiqueta" : "Nueva etiqueta"} onClose={onClose}>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            Nombre
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-invalid={taken}
              aria-describedby="label-hint"
              className={fieldClass}
            />
          </label>
          <p id="label-hint" className={`text-[13px] ${taken ? "font-semibold text-danger" : "text-muted"}`}>
            {taken ? `Ya hay una etiqueta «${clean}».` : clean ? `Escribe @${clean} en una tarea para ponérsela.` : "Sin espacios: se escribe con @ en las tareas."}
          </p>
        </div>

        <ColorPicker value={color} onChange={setColor} />

        <div className="flex items-center justify-end gap-2 pt-1">
          {label && onDelete && (
            <button
              type="button"
              onClick={remove}
              className="mr-auto min-h-11 rounded-lg px-3 text-sm font-semibold text-danger hover:bg-track"
            >
              Borrar etiqueta
            </button>
          )}
          <button type="button" onClick={onClose} className="min-h-11 rounded-lg px-4 text-sm font-semibold text-ink-soft hover:bg-track">
            Cancelar
          </button>
          <button
            type="submit"
            disabled={!clean || taken}
            className="min-h-11 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40"
          >
            {label ? "Guardar" : "Crear etiqueta"}
          </button>
        </div>
      </form>
    </Dialog>
  );
}
