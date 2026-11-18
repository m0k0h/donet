"use client";

import { useEffect, useRef, useState } from "react";
import { todayISO } from "@/lib/tasks";
import { fieldClass } from "./Dialog";
import { ChevronIcon, ClockIcon, CloseIcon } from "./icons";

const POPOVER_HEIGHT = 400; // alto aproximado del desplegable, con margen
const WEEKDAYS = ["L", "M", "X", "J", "V", "S", "D"];

const iso = (d: Date) => d.toLocaleDateString("sv-SE");
const addDays = (date: string, n: number) => {
  const d = new Date(date + "T00:00");
  d.setDate(d.getDate() + n);
  return iso(d);
};
const weekday = (date: string) => new Date(date + "T00:00").toLocaleDateString("es-ES", { weekday: "short" });

function label(value: string | undefined, today: string) {
  if (!value) return "Sin fecha";
  if (value === today) return "Hoy";
  if (value === addDays(today, 1)) return "Mañana";
  return new Date(value + "T00:00").toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" });
}

export type DateTime = { due?: string; time?: string };

// Campo de fecha y hora: por defecto «Sin fecha». Al abrirlo ofrece Hoy y Mañana en una fila,
// justo debajo la hora (un botón «Añadir hora», casi nunca hace falta) y el calendario al final.
// Va compacto para caber en pantallas de portátil; la hora está arriba para que siempre se vea.
// Sin fecha no hay hora: si se pone hora sin fecha, la fecha pasa a ser hoy.
// El desplegable se abre hacia abajo si cabe y, si no, hacia arriba.
export default function DatePicker({
  value,
  time,
  onChange,
}: {
  value?: string;
  time?: string;
  onChange: (v: DateTime) => void;
}) {
  const today = todayISO();
  const [open, setOpen] = useState(false);
  const [addingTime, setAddingTime] = useState(false);
  const [up, setUp] = useState(false);
  const [maxHeight, setMaxHeight] = useState<number>();
  const [month, setMonth] = useState(() => (value ?? today).slice(0, 7)); // YYYY-MM
  const ref = useRef<HTMLDivElement>(null);

  // Se cierra al pulsar fuera.
  useEffect(() => {
    if (!open) return;
    const close = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  function pick(v?: string) {
    onChange({ due: v, time: v ? time : undefined });
    setOpen(false);
  }

  function setTime(t?: string) {
    onChange({ due: t ? (value ?? today) : value, time: t });
  }

  function toggle() {
    if (!open) {
      setMonth((value ?? today).slice(0, 7));
      const r = ref.current!.getBoundingClientRect();
      const below = window.innerHeight - r.bottom;
      const openUp = below < POPOVER_HEIGHT && r.top > below;
      setUp(openUp);
      // Si no cabe entero en ningún lado, se recorta al hueco disponible y hace scroll.
      setMaxHeight((openUp ? r.top : below) - 16);
      setAddingTime(false);
    }
    setOpen((o) => !o);
  }

  // Cuadrícula del mes, empezando en lunes.
  const first = new Date(month + "-01T00:00");
  const offset = (first.getDay() + 6) % 7;
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const cells = [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`),
  ];
  const shiftMonth = (n: number) => {
    const d = new Date(first);
    d.setMonth(d.getMonth() + n);
    setMonth(iso(d).slice(0, 7));
  };
  const monthLabel = first.toLocaleDateString("es-ES", { month: "long", year: "numeric" });

  const tomorrow = addDays(today, 1);
  const quick: { label: string; value?: string; hint: string }[] = [
    { label: "Hoy", value: today, hint: weekday(today) },
    { label: "Mañana", value: tomorrow, hint: weekday(tomorrow) },
    ...(value ? [{ label: "Sin fecha", value: undefined, hint: "" }] : []),
  ];

  return (
    <div
      ref={ref}
      className="relative"
      onKeyDown={(e) => {
        // Escape cierra solo el desplegable, no todo el formulario.
        if (e.key === "Escape" && open) {
          e.preventDefault();
          e.stopPropagation();
          setOpen(false);
        }
      }}
    >
      <button
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Fecha: ${label(value, today)}${time ? `, ${time}` : ""}`}
        className={`${fieldClass} flex items-center justify-between gap-2 pr-3.5 text-left ${value ? "" : "text-muted"}`}
      >
        <span className="truncate">
          {label(value, today)}
          {time && <span className="text-ink-soft"> · {time}</span>}
        </span>
        <span className="text-muted">
          <ChevronIcon size={16} open />
        </span>
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Elegir fecha"
          style={{ maxHeight }}
          className={`absolute left-0 z-10 w-[296px] overflow-y-auto max-w-[calc(100vw-2.5rem)] rounded-xl border border-line bg-bg p-2 shadow-xl ${
            up ? "bottom-full mb-2" : "top-full mt-2"
          }`}
        >
          {/* Accesos rápidos, uno debajo del otro (filas bajas para que quepa en portátil) */}
          <ul className="flex flex-col">
            {quick.map((q) => (
              <li key={q.label}>
                <button
                  type="button"
                  onClick={() => pick(q.value)}
                  aria-pressed={value === q.value}
                  className={`flex h-9 w-full items-center justify-between rounded-lg px-3 text-left text-[15px] font-medium hover:bg-track ${
                    value === q.value ? "bg-accent-soft font-bold text-accent-ink" : ""
                  }`}
                >
                  {q.label}
                  <span className="text-sm font-normal text-muted">{q.hint}</span>
                </button>
              </li>
            ))}
          </ul>

          {/* Hora: arriba del calendario para que se vea sin tener que bajar */}
          <div className="border-b border-line pb-1.5">
            {time || addingTime ? (
              <div className="flex items-center gap-2">
                <label htmlFor="due-time" className="flex items-center gap-2 pl-3 text-sm font-semibold text-ink-soft">
                  <ClockIcon size={16} />
                  Hora
                </label>
                <input
                  id="due-time"
                  type="time"
                  autoFocus={!time}
                  value={time ?? ""}
                  onChange={(e) => setTime(e.target.value || undefined)}
                  className={`${fieldClass} min-h-9 flex-1 py-1`}
                />
                <button
                  type="button"
                  onClick={() => {
                    setTime(undefined);
                    setAddingTime(false);
                  }}
                  aria-label="Quitar hora"
                  title="Quitar hora"
                  className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted hover:bg-track hover:text-ink"
                >
                  <CloseIcon size={14} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setAddingTime(true)}
                className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-[15px] font-medium text-ink-soft hover:bg-track"
              >
                <ClockIcon size={16} />
                Añadir hora
              </button>
            )}
          </div>

          <div className="flex items-center justify-between pt-1">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              aria-label="Mes anterior"
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-track"
            >
              <span className="rotate-180">
                <ChevronIcon size={16} />
              </span>
            </button>
            <span className="text-sm font-bold first-letter:uppercase">{monthLabel}</span>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Mes siguiente"
              className="grid h-9 w-9 place-items-center rounded-lg text-ink-soft hover:bg-track"
            >
              <ChevronIcon size={16} />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center text-[11px] font-semibold text-muted" aria-hidden="true">
            {WEEKDAYS.map((d) => (
              <span key={d} className="pb-0.5">
                {d}
              </span>
            ))}
          </div>
          {/* Días: algo más grandes en móvil (dedo), más compactos con ratón */}
          <div className="grid grid-cols-7 gap-y-0.5 md:gap-y-0">
            {cells.map((d, i) =>
              d ? (
                <button
                  key={d}
                  type="button"
                  onClick={() => pick(d)}
                  aria-label={new Date(d + "T00:00").toLocaleDateString("es-ES", { dateStyle: "full" })}
                  aria-pressed={d === value}
                  className={`mx-auto grid h-9 w-9 place-items-center rounded-full text-sm md:h-7 md:w-8 ${
                    d === value
                      ? "bg-accent font-bold text-white"
                      : d === today
                        ? "font-bold text-accent-ink ring-1 ring-accent"
                        : d < today
                          ? "text-muted hover:bg-track"
                          : "hover:bg-track"
                  }`}
                >
                  {Number(d.slice(8))}
                </button>
              ) : (
                <span key={`e${i}`} />
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
