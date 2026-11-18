"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

// Botón de icono para alternar el tema. El nombre accesible dice la acción
// ("Cambiar a modo oscuro"), así que no depende de reconocer el dibujo.
export default function ThemeToggle() {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, getTheme, () => "light");
  const next: Theme = theme === "dark" ? "light" : "dark";
  const label = next === "dark" ? "Cambiar a modo oscuro" : "Cambiar a modo claro";

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={label}
      title={label}
      suppressHydrationWarning
      className="grid h-11 w-11 shrink-0 place-items-center rounded-lg text-ink-soft hover:bg-track hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
    >
      {/* El icono lo decide el CSS según el tema, para que no parpadee al cargar. */}
      <span className="theme-icon-light">
        <MoonIcon />
      </span>
      <span className="theme-icon-dark">
        <SunIcon />
      </span>
    </button>
  );
}

// Elección de tema con las dos opciones a la vista (en Ajustes).
export function ThemeChoice() {
  const theme = useSyncExternalStore<Theme>(subscribeTheme, getTheme, () => "light");
  const options: { id: Theme; label: string; icon: React.ReactNode }[] = [
    { id: "light", label: "Claro", icon: <SunIcon size={18} /> },
    { id: "dark", label: "Oscuro", icon: <MoonIcon size={18} /> },
  ];
  return (
    <div role="radiogroup" aria-label="Tema" className="grid grid-cols-2 gap-1 rounded-xl bg-sunk p-1">
      {options.map((o) => {
        const on = theme === o.id;
        return (
          <button
            key={o.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setTheme(o.id)}
            suppressHydrationWarning
            className={`flex min-h-11 items-center justify-center gap-2 rounded-lg text-[15px] ${
              on ? "bg-bg font-bold text-ink shadow-sm" : "font-semibold text-muted hover:text-ink"
            }`}
          >
            {o.icon}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
