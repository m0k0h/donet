"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import Logo from "./Logo";

const ERRORS: Record<string, string> = {
  invalid_credentials: "Correo o contraseña incorrectos.",
  email_not_confirmed: "Confirma tu correo antes de entrar: revisa tu bandeja de entrada.",
  user_already_exists: "Ya existe una cuenta con ese correo.",
  weak_password: "La contraseña es demasiado débil (mínimo 6 caracteres).",
  over_email_send_rate_limit: "Demasiados intentos. Espera un momento y vuelve a probar.",
};

export default function AuthScreen() {
  const [mode, setMode] = useState<"in" | "up">("in");
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

  const field = "min-h-9 w-full rounded-lg bg-bg px-3.5 text-base outline-none placeholder:text-muted";

  return (
    <div data-space="personal" className="grid min-h-dvh place-items-center px-4">
      <form onSubmit={submit} className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-sunk p-6">
        <Logo size={28} surface="var(--sunk)" />
        <h1 className="text-xl font-extrabold tracking-[-0.02em]">
          {mode === "in" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>
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
          className="min-h-9 rounded-lg bg-accent px-5 text-sm font-bold text-white disabled:opacity-40"
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
          className="min-h-11 text-sm font-semibold text-ink-soft"
        >
          {mode === "in" ? "¿No tienes cuenta? Créala" : "Ya tengo cuenta"}
        </button>
      </form>
    </div>
  );
}
