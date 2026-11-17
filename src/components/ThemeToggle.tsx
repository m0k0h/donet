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
