"use client";

import { useEffect, useState } from "react";
import {
  disconnectGoogleAccount,
  fetchGoogleAccounts,
  fetchGoogleClientId,
  fetchSavedCalendars,
  ReauthError,
  setCalendarSpaces,
  startGoogleConnect,
  syncAccountCalendars,
  type GoogleAccount,
  type GoogleCalendar,
} from "@/lib/google";
import { SPACES, type Space } from "@/lib/tasks";
import { PlusIcon } from "./icons";

// Ajustes → Calendarios de Google: cuentas conectadas, sus calendarios y en qué
// sección (Personal, Laboral o las dos) se ven los eventos de cada uno.
export function GoogleCalendarsSettings({ onChange }: { onChange: () => void }) {
  // undefined = cargando; null = falta configurar Google en Supabase.
  const [clientId, setClientId] = useState<string | null | undefined>(undefined);
  const [accounts, setAccounts] = useState<GoogleAccount[]>([]);
  const [calendars, setCalendars] = useState<GoogleCalendar[]>([]);
  // Cuentas cuyos calendarios se están leyendo de Google, y las que han fallado.
  const [syncing, setSyncing] = useState<Set<string>>(new Set());
  const [failed, setFailed] = useState<Record<string, "reauth" | "error">>({});
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let accs: GoogleAccount[];
      let saved: GoogleCalendar[];
      try {
        const [id, a, s] = await Promise.all([fetchGoogleClientId(), fetchGoogleAccounts(), fetchSavedCalendars()]);
        if (cancelled) return;
        setClientId(id);
        setAccounts(a);
        setCalendars(s);
        accs = a;
        saved = s;
      } catch {
        if (!cancelled) setClientId(null);
        return;
      }
      // Trae de Google la lista al día (calendarios nuevos, nombres y colores).
      setSyncing(new Set(accs.filter((a) => !a.needsReauth).map((a) => a.id)));
      await Promise.all(
        accs.map(async (a) => {
          if (a.needsReauth) {
            setFailed((f) => ({ ...f, [a.id]: "reauth" }));
            return;
          }
          try {
            const fresh = await syncAccountCalendars(a, saved);
            if (cancelled) return;
            setCalendars((prev) => [...prev.filter((c) => c.accountId !== a.id), ...fresh]);
          } catch (e) {
            if (!cancelled) setFailed((f) => ({ ...f, [a.id]: e instanceof ReauthError ? "reauth" : "error" }));
          } finally {
            if (!cancelled)
              setSyncing((s) => {
                const n = new Set(s);
                n.delete(a.id);
                return n;
              });
          }
        }),
      );
      if (!cancelled) onChange();
    })();
    return () => {
      cancelled = true;
    };
    // Solo al abrir Ajustes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const connect = (loginHint?: string) =>
    clientId && startGoogleConnect(clientId, window.location.pathname.replace(process.env.NEXT_PUBLIC_BASE_PATH ?? "", "") || "/", loginHint);

  function toggleSpace(c: GoogleCalendar, space: Space) {
    const spaces = c.spaces.includes(space) ? c.spaces.filter((s) => s !== space) : [...c.spaces, space];
    const same = (x: GoogleCalendar) => x.accountId === c.accountId && x.calendarId === c.calendarId;
    setCalendars((prev) => prev.map((x) => (same(x) ? { ...x, spaces } : x)));
    setCalendarSpaces(c, spaces)
      .then(() => {
        setError("");
        onChange();
      })
      .catch(() => {
        setCalendars((prev) => prev.map((x) => (same(x) ? c : x)));
        setError("No se ha podido guardar el cambio. Comprueba la conexión.");
      });
  }

  async function remove(a: GoogleAccount) {
    setConfirmRemove(null);
    try {
      await disconnectGoogleAccount(a.id);
      setAccounts((prev) => prev.filter((x) => x.id !== a.id));
      setCalendars((prev) => prev.filter((c) => c.accountId !== a.id));
      setError("");
      onChange();
    } catch {
      setError("No se ha podido quitar la cuenta. Comprueba la conexión.");
    }
  }

  return (
    <section className="flex flex-col gap-2">
      <h3 className="text-[13px] font-bold uppercase tracking-wide text-muted">Calendarios de Google</h3>
      {clientId === undefined ? (
        <p className="text-sm text-muted">Cargando…</p>
      ) : clientId === null ? (
        <p className="rounded-xl bg-sunk px-4 py-3 text-sm text-muted">
          Falta configurar Google en Supabase: ejecuta <code>supabase/schema.sql</code> y guarda el cliente OAuth (mira
          el README).
        </p>
      ) : (
        <>
          <p className="text-sm text-muted">
            {accounts.length
              ? "Marca en qué sección quieres ver cada calendario."
              : "Conecta tu cuenta para ver tus eventos en Hoy y Próximo."}
          </p>
          {error && (
            <p role="alert" className="text-sm font-semibold text-danger">
              {error}
            </p>
          )}
          {accounts.map((a) => {
            const list = calendars.filter((c) => c.accountId === a.id);
            return (
              <div key={a.id} className="flex flex-col gap-1 rounded-xl bg-sunk p-2">
                <div className="flex items-center gap-2 pl-2">
                  <p className="min-w-0 flex-1 truncate text-[15px] font-bold" title={a.email}>
                    {a.email}
                  </p>
                  {confirmRemove === a.id ? (
                    <>
                      <button
                        onClick={() => remove(a)}
                        className="min-h-11 rounded-lg px-3 text-sm font-bold text-danger hover:bg-track"
                      >
                        Quitar
                      </button>
                      <button
                        onClick={() => setConfirmRemove(null)}
                        className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-track"
                      >
                        Cancelar
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setConfirmRemove(a.id)}
                      aria-label={`Quitar la cuenta ${a.email}`}
                      className="min-h-11 rounded-lg px-3 text-sm font-semibold text-muted hover:bg-track hover:text-ink"
                    >
                      Quitar
                    </button>
                  )}
                </div>
                {failed[a.id] === "reauth" ? (
                  <div className="flex items-center gap-2 px-2 pb-1">
                    <p className="flex-1 text-sm text-danger">Google ha retirado el permiso.</p>
                    <button
                      onClick={() => connect(a.email)}
                      className="min-h-11 rounded-lg bg-bg px-3 text-sm font-bold hover:bg-track"
                    >
                      Volver a conectar
                    </button>
                  </div>
                ) : failed[a.id] === "error" ? (
                  <p className="px-2 pb-1 text-sm text-muted">No se han podido leer los calendarios de Google ahora mismo.</p>
                ) : null}
                {syncing.has(a.id) && !list.length && <p className="px-2 pb-1 text-sm text-muted">Leyendo calendarios…</p>}
                <ul className="flex flex-col">
                  {list.map((c) => (
                    <li key={c.calendarId} className="flex items-center gap-2 rounded-lg py-1 pl-2">
                      <span aria-hidden="true" className="h-3 w-3 shrink-0 rounded-full" style={{ background: c.color }} />
                      <span className="min-w-0 flex-1 truncate text-[15px]" title={c.name}>
                        {c.name}
                      </span>
                      <div role="group" aria-label={`Secciones de ${c.name}`} className="flex shrink-0 gap-1">
                        {SPACES.map((s) => {
                          const on = c.spaces.includes(s.id);
                          return (
                            <button
                              key={s.id}
                              data-space={s.id}
                              onClick={() => toggleSpace(c, s.id)}
                              aria-pressed={on}
                              className={`min-h-9 rounded-lg px-2.5 text-[13px] ${
                                on ? "bg-accent font-bold text-white" : "bg-bg font-semibold text-muted hover:text-ink"
                              }`}
                            >
                              {s.label}
                            </button>
                          );
                        })}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
          <button
            onClick={() => connect()}
            className="flex min-h-11 items-center justify-center gap-2 rounded-lg bg-sunk px-4 text-[15px] font-bold hover:bg-track"
          >
            <PlusIcon size={18} />
            Añadir cuenta de Google
          </button>
        </>
      )}
    </section>
  );
}
