// Estado vacío de la lista de la compra, con el mismo estilo que los de Hoy y Próximo:
// una bolsa de la compra con cara, flotando, esperando a que le apuntes algo.
// Usa los colores del espacio (--accent, --mark…), así sirve en claro, oscuro, Personal y Trabajo.

export function EmptyShopping({ shared }: { shared: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-14 text-center">
      <svg width="148" height="140" viewBox="0 0 148 140" aria-hidden="true" className="overflow-visible">
        {/* Sombra en el suelo */}
        <ellipse className="empty-shadow" cx="74" cy="128" rx="34" ry="5" fill="var(--track)" />

        <g className="empty-float">
          {/* Asas, detrás de la bolsa */}
          <path
            d="M56 50V38a18 18 0 0 1 36 0v12"
            fill="none"
            stroke="var(--ink-soft)"
            strokeWidth="7"
            strokeLinecap="round"
          />
          {/* Cuerpo */}
          <path
            d="M40 44h68a6 6 0 0 1 6 6.5l-4.4 57.5a8 8 0 0 1-8 7.5H46.4a8 8 0 0 1-8-7.5L34 50.5A6 6 0 0 1 40 44z"
            fill="var(--accent-soft)"
          />
          {/* Borde de arriba */}
          <rect x="34" y="44" width="80" height="13" rx="6.5" fill="var(--accent)" />

          {/* Cara */}
          <g fill="none" stroke="var(--accent-ink)" strokeWidth="4" strokeLinecap="round">
            <path d="M56 80q5-6 10 0" />
            <path d="M82 80q5-6 10 0" />
            <path d="M66 93q8 8 16 0" />
          </g>
          {/* Mofletes */}
          <circle cx="51" cy="90" r="5" fill="var(--mark)" opacity="0.35" />
          <circle cx="97" cy="90" r="5" fill="var(--mark)" opacity="0.35" />
        </g>

        {/* Destellos */}
        <g fill="var(--mark)">
          <path className="empty-twinkle" d="M128 30l2.5 6.5L137 39l-6.5 2.5L128 48l-2.5-6.5L119 39l6.5-2.5z" />
          <path className="empty-twinkle empty-delay" d="M18 62l1.8 4.2L24 68l-4.2 1.8L18 74l-1.8-4.2L12 68l4.2-1.8z" />
          <circle className="empty-twinkle empty-delay-2" cx="124" cy="82" r="3" />
        </g>
      </svg>

      <div className="flex flex-col gap-1">
        <p className="text-lg font-extrabold tracking-[-0.01em]">Lista vacía</p>
        <p className="text-sm text-muted">
          Apunta lo que se vaya acabando{shared ? " y lo verá el resto de la lista" : ""}.
        </p>
      </div>
    </div>
  );
}
