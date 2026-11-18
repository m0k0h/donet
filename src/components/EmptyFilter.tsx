import type { View } from "@/lib/tasks";

// Estado vacío de los filtros (Hoy y Próximo): un calendario con cara.
// Hoy: contento, con destellos. Próximo: echándose una siesta.
// Usa los colores del espacio (--accent, --mark…), así sirve en claro, oscuro, Personal y Trabajo.

const COPY: Record<Exclude<View, "inbox">, { title: string; text: string }> = {
  today: { title: "Día despejado", text: "No tienes nada para hoy. Aprovecha." },
  upcoming: { title: "Nada a la vista", text: "Tu agenda de los próximos días está en calma." },
  agenda: { title: "Agenda despejada", text: "Nada para hoy ni para los próximos días." },
};

export function EmptyFilter({ view }: { view: Exclude<View, "inbox"> }) {
  const { title, text } = COPY[view];
  const happy = view !== "upcoming";

  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      <svg width="148" height="140" viewBox="0 0 148 140" aria-hidden="true" className="overflow-visible">
        {/* Sombra en el suelo */}
        <ellipse className="empty-shadow" cx="74" cy="128" rx="34" ry="5" fill="var(--track)" />

        <g className="empty-float">
          {/* Cuerpo */}
          <rect x="32" y="26" width="84" height="88" rx="18" fill="var(--accent-soft)" />
          <path d="M32 50V44a18 18 0 0 1 18-18h48a18 18 0 0 1 18 18v6z" fill="var(--accent)" />
          {/* Anillas */}
          <rect x="51" y="16" width="8" height="20" rx="4" fill="var(--ink-soft)" />
          <rect x="89" y="16" width="8" height="20" rx="4" fill="var(--ink-soft)" />

          {/* Cara */}
          {happy ? (
            <g fill="none" stroke="var(--accent-ink)" strokeWidth="4" strokeLinecap="round">
              <path d="M56 76q5-6 10 0" />
              <path d="M82 76q5-6 10 0" />
              <path d="M66 89q8 8 16 0" />
            </g>
          ) : (
            <g fill="none" stroke="var(--accent-ink)" strokeWidth="4" strokeLinecap="round">
              <path d="M56 75q5 5 10 0" />
              <path d="M82 75q5 5 10 0" />
              <path d="M70 91h8" />
            </g>
          )}
          {/* Mofletes */}
          <circle cx="51" cy="86" r="5" fill="var(--mark)" opacity="0.35" />
          <circle cx="97" cy="86" r="5" fill="var(--mark)" opacity="0.35" />
        </g>

        {happy ? (
          <g fill="var(--mark)">
            <path className="empty-twinkle" d="M128 30l2.5 6.5L137 39l-6.5 2.5L128 48l-2.5-6.5L119 39l6.5-2.5z" />
            <path
              className="empty-twinkle empty-delay"
              d="M18 62l1.8 4.2L24 68l-4.2 1.8L18 74l-1.8-4.2L12 68l4.2-1.8z"
            />
            <circle className="empty-twinkle empty-delay-2" cx="124" cy="78" r="3" />
          </g>
        ) : (
          <g fill="var(--muted)" fontWeight="800" fontFamily="inherit">
            <text className="empty-zz" x="118" y="40" fontSize="18">
              z
            </text>
            <text className="empty-zz empty-delay" x="130" y="22" fontSize="13">
              z
            </text>
          </g>
        )}
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-extrabold tracking-[-0.01em]">{title}</p>
        <p className="text-sm text-muted">{text}</p>
      </div>
    </div>
  );
}
