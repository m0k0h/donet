// Tema claro/oscuro. Sin preferencia guardada se sigue al sistema; al elegir
// a mano se marca <html data-theme="…"> y se recuerda en localStorage.
export type Theme = "light" | "dark";

export const THEME_KEY = "donet.theme.v1";
const QUERY = "(prefers-color-scheme: dark)";
const EVENT = "donet:theme";

// Se ejecuta antes del primer pintado (ver layout.tsx) para evitar el parpadeo.
export const THEME_INIT_SCRIPT = `try{var t=localStorage.getItem("${THEME_KEY}");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t}catch(e){}`;

const systemTheme = (): Theme => (window.matchMedia(QUERY).matches ? "dark" : "light");

export function getTheme(): Theme {
  const t = document.documentElement.dataset.theme;
  return t === "light" || t === "dark" ? t : systemTheme();
}

export function setTheme(theme: Theme) {
  // Si coincide con el sistema no hace falta forzar nada: se vuelve a seguirlo.
  const override = theme === systemTheme() ? null : theme;
  if (override) document.documentElement.dataset.theme = override;
  else delete document.documentElement.dataset.theme;
  try {
    if (override) localStorage.setItem(THEME_KEY, override);
    else localStorage.removeItem(THEME_KEY);
  } catch {
    // Sin almacenamiento el cambio vale solo para esta visita.
  }
  window.dispatchEvent(new Event(EVENT));
}

export function subscribeTheme(onChange: () => void) {
  const media = window.matchMedia(QUERY);
  media.addEventListener("change", onChange);
  window.addEventListener(EVENT, onChange);
  return () => {
    media.removeEventListener("change", onChange);
    window.removeEventListener(EVENT, onChange);
  };
}
