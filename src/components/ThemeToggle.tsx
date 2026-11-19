"use client";

import { useSyncExternalStore } from "react";
import { getTheme, setTheme, subscribeTheme, type Theme } from "@/lib/theme";
import { MoonIcon, SunIcon } from "./icons";

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
