// "done" + la t en un cuadro verde, con una marca de hecho del color del espacio.
// `surface` es el color de fondo sobre el que va el logo: recorta la marca del cuadro.
export default function Logo({ size = 28, surface = "var(--bg)" }: { size?: number; surface?: string }) {
  const mark = Math.round(size * 0.6);
  return (
    <span
      className="flex items-center font-extrabold leading-none tracking-[-0.03em]"
      style={{ fontSize: size, gap: Math.round(size * 0.14) }}
    >
      done
      <span
        className="relative grid place-items-center bg-green text-on-green"
        style={{ width: size, height: size, borderRadius: size * 0.26 }}
      >
        <span className="sr-only">t</span>
        {/* La t va dibujada a mano, con el pie curvado, para que no parezca una cruz. */}
        <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true">
          <path
            d="M22 8v21q0 7.5 7.5 7.5H35M13 18.5h20.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="7.5"
            strokeLinejoin="round"
          />
        </svg>
        <svg
          width={mark}
          height={mark}
          viewBox="0 0 48 48"
          aria-hidden="true"
          className="absolute"
          style={{ top: -mark * 0.45, right: -mark * 0.6 }}
        >
          <path d="M8 26l11 11 21-24" fill="none" stroke={surface} strokeWidth="20" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M8 26l11 11 21-24" fill="none" stroke="var(--mark)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </span>
  );
}
