import Link from "next/link";
import type { ReactNode } from "react";
import Logo from "./Logo";
import { CalendarIcon, CartIcon, CheckIcon, ClockIcon, FolderIcon, SpaceIcon, SubtaskIcon } from "./icons";

const SIGN_IN = "/personal";
const SIGN_UP = "/personal?registro=1";

const FEATURES: { icon: ReactNode; title: string; text: string }[] = [
  {
    icon: <SunMark />,
    title: "Hoy y Próximo",
    text: "Lo que toca hoy, arriba y sin ruido. Próximo va día a día con tus tareas y los eventos de la semana.",
  },
  {
    icon: <FolderIcon size={22} />,
    title: "Proyectos anidables",
    text: "Proyectos dentro de proyectos, con color propio y en árbol. Lo que no tiene proyecto cae en Entrada.",
  },
  {
    icon: <SubtaskIcon size={22} />,
    title: "Subtareas a cualquier nivel",
    text: "Divide cada tarea en pasos y despliégalos en Hoy y Próximo sin salir de la lista.",
  },
  {
    icon: <CalendarIcon size={22} />,
    title: "Google Calendar",
    text: "Conecta una o varias cuentas y ve tus eventos en Hoy y Próximo. Solo lectura, y los ocultas cuando quieras.",
  },
  {
    icon: <ClockIcon size={22} />,
    title: "Fechas en lenguaje natural",
    text: "Escribe «mañana a las 10» o «el viernes» y doneT pone la fecha y la hora por ti.",
  },
  {
    icon: <SpaceIcon space="work" size={22} />,
    title: "Personal y Laboral",
    text: "Dos secciones separadas, cada una con su color, sus proyectos y sus calendarios.",
  },
  {
    icon: <CartIcon size={22} />,
    title: "Listas de la compra",
    text: "Compártelas con un enlace y los cambios se ven al momento en todos los móviles.",
  },
  {
    icon: <DevicesMark />,
    title: "En el móvil y en el ordenador",
    text: "Se sincroniza con tu cuenta, tiene modo claro y oscuro y se adapta a cualquier pantalla.",
  },
];

// Portada para quien entra sin sesión: explica qué es doneT y lleva a entrar o registrarse.
export default function Landing() {
  return (
    <div data-space="personal" className="min-h-dvh">
      <header className="mx-auto flex max-w-[1080px] items-center justify-between gap-3 px-4 py-4 md:px-6">
        <Logo size={26} />
        <Link
          href={SIGN_IN}
          className="flex min-h-11 items-center rounded-lg px-3 text-sm font-bold text-ink-soft hover:text-ink"
        >
          Iniciar sesión
        </Link>
      </header>

      <main>
        <section className="mx-auto grid max-w-[1080px] items-center gap-10 px-4 pt-8 pb-14 md:grid-cols-[1.1fr_1fr] md:px-6 md:pt-16 md:pb-20">
          <div className="flex flex-col gap-5">
            <h1 className="text-[40px] leading-[1.05] font-extrabold tracking-[-0.03em] md:text-[56px]">
              Tus tareas, <span className="text-accent">hechas</span>.
            </h1>
            <p className="max-w-[46ch] text-lg leading-relaxed text-ink-soft">
              doneT es un gestor de tareas y proyectos sencillo: apuntas rápido, ves lo que toca hoy y lo que viene, y
              tienes tu calendario de Google al lado.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Link
                href={SIGN_UP}
                className="flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-bold text-white"
              >
                Crear cuenta gratis
              </Link>
              <Link
                href={SIGN_IN}
                className="flex min-h-12 items-center justify-center rounded-lg bg-sunk px-6 text-base font-bold text-ink"
              >
                Ya tengo cuenta
              </Link>
            </div>
          </div>
          <TodayPreview />
        </section>

        <section className="bg-sunk">
          <div className="mx-auto flex max-w-[1080px] flex-col gap-8 px-4 py-14 md:gap-12 md:px-6 md:py-20">
            <div className="flex flex-col gap-3 md:items-center md:text-center">
              <h2 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em] md:text-[38px]">
                Todo lo que necesitas, nada que estorbe
              </h2>
              <p className="max-w-[52ch] text-lg text-ink-soft">
                Lo justo para organizarte el día y la semana, sin menús infinitos.
              </p>
            </div>
            {/* Móvil: icono y título en la misma línea, texto debajo.
                Desde tablet: dos columnas, con el icono a la izquierda y título y texto a su lado. */}
            <ul className="grid gap-4 md:grid-cols-2 md:gap-5">
              {FEATURES.map((f) => (
                <li
                  key={f.title}
                  className="grid grid-cols-[2.5rem_1fr] items-center gap-x-3 gap-y-3 rounded-xl bg-bg p-5 md:grid-cols-[3rem_1fr] md:content-start md:items-start md:gap-x-5 md:gap-y-1.5 md:p-6"
                >
                  <span className="grid size-10 place-items-center rounded-lg bg-accent-soft text-accent-ink md:row-span-2 md:size-12 md:rounded-xl">
                    {f.icon}
                  </span>
                  <h3 className="text-[17px] leading-snug font-bold md:pt-0.5 md:text-lg">{f.title}</h3>
                  <p className="col-span-2 text-[15px] leading-relaxed text-ink-soft md:col-span-1 md:col-start-2">{f.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="mx-auto flex max-w-[1080px] flex-col items-center gap-5 px-4 py-16 text-center md:px-6 md:py-24">
          <h2 className="text-[28px] leading-tight font-extrabold tracking-[-0.02em] md:text-[34px]">
            Empieza a tachar cosas
          </h2>
          <p className="max-w-[40ch] text-lg text-ink-soft">Crea tu cuenta en un minuto y tendrás tus tareas en todos tus dispositivos.</p>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
            <Link
              href={SIGN_UP}
              className="flex min-h-12 items-center justify-center rounded-lg bg-accent px-6 text-base font-bold text-white"
            >
              Crear cuenta gratis
            </Link>
            <Link
              href={SIGN_IN}
              className="flex min-h-12 items-center justify-center rounded-lg bg-sunk px-6 text-base font-bold text-ink"
            >
              Iniciar sesión
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[1080px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-sm text-muted md:px-6">
          <Logo size={18} />
          <Link href="/privacidad" className="flex min-h-11 items-center font-semibold hover:text-ink">
            Privacidad
          </Link>
        </div>
      </footer>
    </div>
  );
}

function SunMark() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}

function DevicesMark() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="2" y="4" width="14" height="10" rx="1.5" />
      <path d="M5 18h8" />
      <rect x="16" y="9" width="6" height="11" rx="1.5" />
    </svg>
  );
}

// Una vista de Hoy de muestra, dibujada con los mismos colores de la app.
function TodayPreview() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4 rounded-2xl border border-line bg-bg p-5 shadow-[0_20px_60px_-30px_rgba(0,0,0,0.35)]">
      <div className="flex items-baseline justify-between">
        <p className="text-2xl font-extrabold tracking-[-0.02em]">Hoy</p>
        <p className="text-sm text-muted">
          {new Date().toLocaleDateString("es-ES", { weekday: "short", day: "numeric", month: "short" })}
        </p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Event time="09:30" title="Reunión de equipo" color="#2563eb" />
        <Event time="13:00" title="Comida con Lucía" color="#0a7f55" />
      </div>
      <ul className="flex flex-col">
        <Task title="Preparar la presentación" meta="Trabajo · 10:00" priority="var(--danger)" />
        <Task title="Revisar las diapositivas" sub done />
        <Task title="Ensayar en voz alta" sub />
        <Task title="Llamar al taller" meta="Coche" priority="var(--soon)" />
        <Task title="Comprar regalo de cumpleaños" meta="Entrada" done />
      </ul>
    </div>
  );
}

function Event({ time, title, color }: { time: string; title: string; color: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-sunk px-3 py-2 text-sm">
      <span className="h-5 w-1 rounded-full" style={{ background: color }} />
      <span className="font-semibold text-muted tabular-nums">{time}</span>
      <span className="truncate font-semibold">{title}</span>
    </div>
  );
}

function Task({ title, meta, priority, sub, done }: { title: string; meta?: string; priority?: string; sub?: boolean; done?: boolean }) {
  return (
    <li className={`flex items-start gap-3 border-b border-line py-2.5 last:border-0 ${sub ? "pl-8" : ""}`}>
      <span
        className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${done ? "border-accent bg-accent text-white" : ""}`}
        style={done ? undefined : { borderColor: priority ?? "var(--ring)" }}
      >
        {done && <CheckIcon size={12} />}
      </span>
      <span className="flex min-w-0 flex-col">
        <span className={`truncate text-[15px] ${done ? "text-muted line-through" : "font-medium"}`}>{title}</span>
        {meta && <span className="text-xs text-muted">{meta}</span>}
      </span>
    </li>
  );
}
