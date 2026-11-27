// Estado vacío de Entrada, con el mismo estilo que los de Hoy, Próximo y la Compra:
// una bandeja de entrada con cara, flotando y contenta de estar despejada.
// Usa los colores del espacio (--accent, --mark…), así sirve en claro, oscuro, Personal y Trabajo.

import { Sentences } from "./Sentences";

export function EmptyInbox() {
  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      <svg width="148" height="140" viewBox="0 0 148 140" aria-hidden="true" className="overflow-visible">
        {/* Sombra en el suelo */}
        <ellipse className="empty-shadow" cx="74" cy="128" rx="34" ry="5" fill="var(--track)" />

        <g className="empty-float">
          {/* Fondo de la bandeja */}
          <rect x="30" y="30" width="88" height="84" rx="18" fill="var(--accent-soft)" />
          {/* Frente, con la muesca de la bandeja */}
          <path
            d="M30 74h22q4 0 5.5 4q4 10 16.5 10t16.5-10q1.5-4 5.5-4h22v22a18 18 0 0 1-18 18H48a18 18 0 0 1-18-18z"
            fill="var(--accent)"
          />

          {/* Cara */}
          <g fill="none" stroke="var(--accent-ink)" strokeWidth="4" strokeLinecap="round">
            <path d="M54 52q5-6 10 0" />
            <path d="M84 52q5-6 10 0" />
            <path d="M66 62q8 7 16 0" />
          </g>
          {/* Mofletes */}
          <circle cx="49" cy="61" r="5" fill="var(--mark)" opacity="0.35" />
          <circle cx="99" cy="61" r="5" fill="var(--mark)" opacity="0.35" />
        </g>

        {/* Destellos */}
        <g fill="var(--mark)">
          <path className="empty-twinkle" d="M128 30l2.5 6.5L137 39l-6.5 2.5L128 48l-2.5-6.5L119 39l6.5-2.5z" />
          <path className="empty-twinkle empty-delay" d="M18 62l1.8 4.2L24 68l-4.2 1.8L18 74l-1.8-4.2L12 68l4.2-1.8z" />
          <circle className="empty-twinkle empty-delay-2" cx="124" cy="82" r="3" />
        </g>
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-extrabold tracking-[-0.01em]">Entrada despejada</p>
        <Sentences className="text-sm text-muted" text="Todo está en su sitio. Lo que apuntes sin proyecto llegará aquí." />
      </div>
    </div>
  );
}
