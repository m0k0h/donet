"use client";

import Link from "next/link";
import { type CSSProperties, useState } from "react";
import { supabase } from "@/lib/supabase";
import Logo from "./Logo";
import { BackIcon, CheckIcon } from "./icons";

const ERRORS: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu correo antes de entrar: revisa tu bandeja de entrada.",
  user_already_exists: "Ya existe una cuenta con ese correo.",
  weak_password: "La contraseña es demasiado débil (mínimo 6 caracteres).",
  over_email_send_rate_limit: "Demasiados intentos. Espera un momento y vuelve a probar.",
};

export default function AuthScreen() {
  // Desde «Crear cuenta» de la portada se llega con ?registro y se abre el registro.
  // Esta pantalla solo se pinta en el navegador, así que puede leer la dirección al empezar.
  const [mode, setMode] = useState<"in" | "up">(() =>
    new URLSearchParams(window.location.search).has("registro") ? "up" : "in",
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    const creds = { email: email.trim(), password };
    const { data, error } =
      mode === "in" ? await supabase!.auth.signInWithPassword(creds) : await supabase!.auth.signUp(creds);
    setBusy(false);
    if (error) setError(ERRORS[error.code ?? ""] ?? "No se ha podido completar. Inténtalo de nuevo.");
    else if (mode === "up" && !data.session) setNotice("Te hemos enviado un correo para confirmar la cuenta.");
  }

  const field = "min-h-11 w-full rounded-lg bg-sunk px-3.5 text-base outline-none placeholder:text-muted focus:ring-2 focus:ring-accent";

  return (
    <div
      data-space="personal"
      className="grid min-h-dvh place-items-center px-4 py-6 md:py-10"
      style={{
        background:
          "radial-gradient(60% 50% at 0% 0%, color-mix(in srgb, var(--accent) 18%, transparent), transparent), radial-gradient(50% 45% at 100% 100%, color-mix(in srgb, var(--green) 16%, transparent), transparent), var(--bg)",
      }}
    >
      <div className="grid w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-bg shadow-[0_24px_70px_-30px_rgba(0,0,0,0.45)] md:max-w-[880px] md:grid-cols-[1fr_1.05fr]">
        <BrandPanel />
        <form onSubmit={submit} className="flex flex-col gap-4 p-6 md:p-10">
          <Link
            href="/"
            className="-ml-1 flex min-h-11 items-center gap-1.5 self-start rounded-lg pr-2 text-sm font-semibold text-muted hover:text-ink"
          >
            <BackIcon size={18} />
            Volver a la portada
          </Link>
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-extrabold tracking-[-0.02em]">
              {mode === "in" ? "Inicia sesión" : "Crea tu cuenta"}
            </h1>
            <p className="text-[15px] text-ink-soft">
              {mode === "in" ? "Hola de nuevo. Entra para seguir con tus tareas." : "Empieza gratis: solo necesitas un correo."}
            </p>
          </div>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Correo"
            aria-label="Correo"
            className={field}
          />
          <input
            type="password"
            required
            minLength={6}
            autoComplete={mode === "in" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Contraseña"
            aria-label="Contraseña"
            className={field}
          />
          {error && <p role="alert" className="text-sm font-semibold text-danger">{error}</p>}
          {notice && <p role="status" className="text-sm font-semibold text-green">{notice}</p>}
          <button
            type="submit"
            disabled={busy}
            className="min-h-11 rounded-lg bg-accent px-5 text-base font-bold text-white disabled:opacity-40"
          >
            {mode === "in" ? "Entrar" : "Crear cuenta"}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode(mode === "in" ? "up" : "in");
              setError("");
              setNotice("");
            }}
            className="min-h-11 text-sm font-semibold text-ink-soft hover:text-ink"
          >
            {mode === "in" ? "¿No tienes cuenta? Créala" : "Ya tengo cuenta"}
          </button>
        </form>
      </div>
    </div>
  );
}

const PERKS = [
  "Hoy y Próximo, con tus eventos de Google Calendar",
  "Proyectos y subtareas a cualquier nivel",
  "Sincronizado en el móvil y el ordenador",
];

// Panel de marca: en escritorio va al lado del formulario; en el móvil, encima y sin la lista.
function BrandPanel() {
  return (
    <aside
      className="relative flex flex-col gap-3 overflow-hidden p-6 text-white md:justify-between md:gap-8 md:p-10"
      style={{ background: "linear-gradient(150deg, #c026d3 0%, #a21caf 45%, #6b21a8 100%)" }}
    >
      {/* Brillos de fondo: el verde del logo y un poco de luz. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -right-16 -bottom-20 size-64 rounded-full opacity-50 blur-3xl"
        style={{ background: "#0a7f55" }}
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 -left-10 size-56 rounded-full bg-white opacity-15 blur-3xl"
      />
      <span className="relative" style={{ "--mark": "#ffffff" } as CSSProperties}>
        <Logo size={30} surface="#b021c2" />
      </span>
      <div className="relative flex flex-col gap-2">
        <p className="text-[26px] leading-[1.1] font-extrabold tracking-[-0.02em] md:text-[34px]">
          Tus tareas, hechas.
        </p>
        <p className="text-[15px] text-white/85">Apunta rápido, mira lo que toca hoy y tacha.</p>
      </div>
      <ul className="relative hidden flex-col gap-3 md:flex">
        {PERKS.map((p) => (
          <li key={p} className="flex items-start gap-3 text-[15px] font-medium">
            <span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-white text-[#a21caf]">
              <CheckIcon size={12} />
            </span>
            {p}
          </li>
        ))}
      </ul>
    </aside>
  );
}
