"use client";

import { useEffect, useRef, type ReactNode, type SelectHTMLAttributes } from "react";
import { ChevronIcon, CloseIcon } from "./icons";

// Ventana modal sobre <dialog>: atrapa el foco, se cierra con Escape o tocando fuera.
// En móvil sale desde abajo; en escritorio, centrada.
export default function Dialog({
  title,
  badge,
  onClose,
  children,
}: {
  title: string;
  // Número junto al título (p. ej. cuántos comentarios hay).
  badge?: number;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  // Sin limpieza: llamar a close() dispararía onClose (y en modo estricto, React
  // monta los efectos dos veces). Al desmontarse, el <dialog> se cierra solo.
  useEffect(() => {
    const d = ref.current!;
    if (d.open) return;
    d.showModal();
    // showModal() enfoca el botón de cerrar; mejor el primer campo del formulario.
    d.querySelector<HTMLElement>("input:not(.sr-only), textarea, select")?.focus();
  }, []);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onClick={(e) => e.target === ref.current && onClose()}
      aria-label={title}
      className="m-0 mt-auto w-full max-w-none overflow-visible rounded-t-2xl bg-bg p-0 text-ink backdrop:bg-black/40 md:m-auto md:max-w-[520px] md:rounded-2xl"
    >
      <div className="flex flex-col gap-4 p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
        <div className="flex items-center justify-between gap-3">
          <h2 className="flex items-center gap-2 text-xl font-extrabold">
            {title}
            {badge !== undefined && (
              <span className="rounded-full bg-track px-2 py-0.5 text-sm font-bold text-ink-soft">{badge}</span>
            )}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="-mr-2 grid h-11 w-11 place-items-center rounded-lg text-ink-soft hover:bg-track"
          >
            <CloseIcon />
          </button>
        </div>
        {children}
      </div>
    </dialog>
  );
}

export const fieldClass = "min-h-11 w-full rounded-lg bg-sunk px-3.5 text-base text-ink outline-none focus-visible:ring-2 focus-visible:ring-accent";
export const labelClass = "flex flex-col gap-1.5 text-sm font-semibold text-ink-soft";

// Desplegable con flecha propia, separada del borde (la nativa queda pegada al final).
export function Select({ className = "", ...props }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <div className="relative">
      <select {...props} className={`${fieldClass} appearance-none pr-10 ${className}`} />
      <span className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 text-muted">
        <ChevronIcon size={16} open />
      </span>
    </div>
  );
}
