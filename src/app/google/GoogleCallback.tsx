"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { connectGoogleAccount, requestReopenSettings, takeGoogleState } from "@/lib/google";
import { supabase } from "@/lib/supabase";
import { loadSpace, spacePath } from "@/lib/tasks";

const ERRORS: Record<string, string> = {
  google_missing_scope: "Hace falta marcar el permiso para ver tus calendarios. Vuelve a intentarlo.",
  google_not_configured: "Falta configurar Google en Supabase (mira el README).",
  google_no_refresh_token: "Google no ha dado acceso permanente. Quita doneT de tu cuenta de Google y vuelve a conectarla.",
};

// Termina la conexión: comprueba que la vuelta es la que se pidió, cambia el código
// por los permisos (en Supabase) y regresa a la app con Ajustes abierto.
export default function GoogleCallback() {
  const router = useRouter();
  const [error, setError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const params = new URLSearchParams(window.location.search);
    const returnTo = takeGoogleState(params.get("state"));
    const back = () => {
      requestReopenSettings();
      router.replace(returnTo ?? spacePath(loadSpace()));
    };
    // Cancelado en Google: se vuelve sin más.
    if (params.get("error")) return back();
    const code = params.get("code");
    if (!code || !returnTo || !supabase) {
      setError("No se ha podido conectar la cuenta. Vuelve a intentarlo desde Ajustes.");
      return;
    }
    (async () => {
      try {
        await supabase.auth.getSession();
        await connectGoogleAccount(code);
        back();
      } catch (e) {
        const msg = (e as { message?: string }).message ?? "";
        const known = Object.keys(ERRORS).find((k) => msg.includes(k));
        setError(known ? ERRORS[known] : "No se ha podido conectar la cuenta. Vuelve a intentarlo desde Ajustes.");
      }
    })();
  }, [router]);

  return (
    <div className="grid min-h-dvh place-items-center px-6 text-center">
      {error ? (
        <div className="flex max-w-sm flex-col items-center gap-4">
          <p className="text-[15px] font-semibold text-danger">{error}</p>
          <button
            onClick={() => router.replace(spacePath(loadSpace()))}
            className="min-h-11 rounded-lg bg-accent px-4 text-sm font-bold text-white"
          >
            Volver a doneT
          </button>
        </div>
      ) : (
        <p className="text-muted">Conectando con Google…</p>
      )}
    </div>
  );
}
