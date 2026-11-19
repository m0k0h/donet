import type { ReactNode } from "react";

// Cabecera de cada pantalla (vistas, proyectos y Compra), igual en todas:
// título grande con sus acciones al lado y, debajo y pegada, una línea con
// dónde estás y una etiqueta con lo que queda pendiente.
export default function PageHeader({
  title,
  leading,
  actions,
  context,
  count,
  aside,
}: {
  title: ReactNode;
  // Algo delante del título, como el punto de color de un proyecto.
  leading?: ReactNode;
  // Botones a la derecha del título.
  actions?: ReactNode;
  // Dónde estás: «Personal › Casa», «Solo tú»…
  context?: ReactNode;
  // Etiqueta con lo pendiente: «3 pendientes», «Nada por comprar»…
  count?: { label: string; empty?: boolean };
  // Control pequeño al final de la línea de abajo (p. ej. ocultar completadas).
  aside?: ReactNode;
}) {
  return (
    <header className="flex flex-col gap-1">
      <div className="flex items-center gap-3">
        {leading}
        <h1 className="min-w-0 flex-1 break-words text-[30px] font-extrabold leading-tight tracking-[-0.02em] md:text-[34px]">
          {title}
        </h1>
        {actions && <div className="-my-1 flex shrink-0 items-center gap-1">{actions}</div>}
      </div>
      {(context || count || aside) && (
        <div className="flex min-h-6 flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-muted">
          {context && <span className="min-w-0">{context}</span>}
          {count && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[12px] font-bold ${
                count.empty ? "bg-track text-muted" : "bg-accent-soft text-accent-ink"
              }`}
            >
              {count.label}
            </span>
          )}
          {/* Margen negativo: el botón mantiene 44 px para el dedo sin separar las líneas. */}
          {aside && <div className="-my-2.5 ml-auto">{aside}</div>}
        </div>
      )}
    </header>
  );
}
