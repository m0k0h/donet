"use client";

import { PROJECT_COLORS } from "@/lib/tasks";
import { CheckIcon } from "./icons";

// Muestrario de colores de proyectos y etiquetas.
export default function ColorPicker({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1.5 text-sm font-semibold text-ink-soft">Color</legend>
      <div className="flex flex-wrap gap-1">
        {PROJECT_COLORS.map((c) => (
          <label key={c.id} title={c.label} className="grid h-11 w-11 cursor-pointer place-items-center">
            <input
              type="radio"
              name="color"
              value={c.id}
              checked={value === c.id}
              onChange={() => onChange(c.id)}
              aria-label={c.label}
              className="peer sr-only"
            />
            <span
              className="grid h-7 w-7 place-items-center rounded-full text-white ring-offset-2 ring-offset-bg peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:outline-2 peer-focus-visible:outline-offset-4 peer-focus-visible:outline-ink"
              style={{ background: c.hex }}
            >
              {value === c.id && <CheckIcon size={14} />}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
