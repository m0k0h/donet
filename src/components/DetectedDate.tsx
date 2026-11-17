"use client";

import { useState } from "react";
import { detectDate, type DetectedDate } from "@/lib/naturalDate";
import { dueLabel, todayISO } from "@/lib/tasks";
import { CloseIcon, ViewIcon } from "./icons";

// Detecta una fecha escrita en el texto de la tarea. Si se descarta («no es una fecha»),
// esa expresión deja de detectarse mientras siga escrita.
export function useDetectedDate(text: string, enabled = true) {
  const [ignored, setIgnored] = useState<string[]>([]);
  const found = enabled ? detectDate(text, todayISO()) : null;
  const detected = found && !ignored.includes(found.match.toLowerCase()) ? found : null;
  return {
    detected,
    ignore: () => detected && setIgnored((prev) => [...prev, detected.match.toLowerCase()]),
    reset: () => setIgnored([]),
  };
}

// Aviso bajo el campo de texto: qué fecha se ha entendido y un botón para descartarla.
export function DetectedDateChip({ detected, onIgnore }: { detected: DetectedDate; onIgnore: () => void }) {
  const label = dueLabel(detected.due, todayISO(), detected.time);
  const full = new Date(detected.due + "T00:00").toLocaleDateString("es-ES", { dateStyle: "full" });
  return (
    <div className="flex items-center gap-1 text-[13px]" aria-live="polite">
      <span className="inline-flex min-w-0 items-center gap-1.5 rounded-md bg-accent-soft py-1 pl-2 pr-2.5 font-semibold text-accent-ink">
        <ViewIcon view="upcoming" size={14} />
        <span className="truncate" title={full}>
          {label}
        </span>
      </span>
      <span className="min-w-0 truncate text-muted">por «{detected.match}»</span>
      <button
        type="button"
        onClick={onIgnore}
        aria-label={`No es una fecha: ${detected.match}`}
        title="No es una fecha"
        className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-muted hover:bg-track hover:text-ink"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}
