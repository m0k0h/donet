import { PlusIcon } from "./icons";
import { Sentences } from "./Sentences";

// Estado vacío de un proyecto sin pendientes, con el mismo estilo que los de Entrada, Hoy y la Compra:
// una lista con todo marcado y cara contenta. Invita a apuntar lo siguiente con un acceso directo.
// Usa los colores del espacio (--accent, --mark…), así sirve en claro, oscuro, Personal y Trabajo.

export function EmptyProject({ onAdd }: { onAdd?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-4 py-12 text-center">
      <svg width="148" height="140" viewBox="0 0 148 140" aria-hidden="true" className="overflow-visible">
        {/* Sombra en el suelo */}
        <ellipse className="empty-shadow" cx="74" cy="128" rx="34" ry="5" fill="var(--track)" />

        <g className="empty-float">
          {/* Hoja */}
          <rect x="34" y="22" width="80" height="94" rx="18" fill="var(--accent-soft)" />
          {/* Pinza */}
          <rect x="56" y="14" width="36" height="16" rx="8" fill="var(--accent)" />

          {/* Líneas hechas */}
          <g fill="none" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M48 46l4 4 7-8" stroke="var(--accent)" />
            <path d="M66 46h32" stroke="var(--track)" />
            <path d="M48 62l4 4 7-8" stroke="var(--accent)" />
            <path d="M66 62h24" stroke="var(--track)" />
          </g>

          {/* Cara */}
          <g fill="none" stroke="var(--accent-ink)" strokeWidth="4" strokeLinecap="round">
            <path d="M58 86q5-6 10 0" />
            <path d="M80 86q5-6 10 0" />
            <path d="M66 97q8 7 16 0" />
          </g>
          {/* Mofletes */}
          <circle cx="53" cy="95" r="5" fill="var(--mark)" opacity="0.35" />
          <circle cx="95" cy="95" r="5" fill="var(--mark)" opacity="0.35" />
        </g>

        {/* Destellos */}
        <g fill="var(--mark)">
          <path className="empty-twinkle" d="M128 30l2.5 6.5L137 39l-6.5 2.5L128 48l-2.5-6.5L119 39l6.5-2.5z" />
          <path className="empty-twinkle empty-delay" d="M18 62l1.8 4.2L24 68l-4.2 1.8L18 74l-1.8-4.2L12 68l4.2-1.8z" />
          <circle className="empty-twinkle empty-delay-2" cx="124" cy="82" r="3" />
        </g>
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-extrabold tracking-[-0.01em]">Proyecto al día</p>
        <Sentences className="text-sm text-muted" text="No queda nada pendiente. ¿Qué es lo siguiente?" />
      </div>

      {onAdd && (
        <button
          onClick={onAdd}
          className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-accent px-5 text-sm font-bold text-white"
        >
          <PlusIcon size={18} />
          Añadir tarea
        </button>
      )}
    </div>
  );
}
