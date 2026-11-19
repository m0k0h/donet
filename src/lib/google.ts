import { supabase } from "./supabase";
import type { Space } from "./tasks";

// Calendarios de Google, solo lectura. El intercambio de códigos y la renovación de
// permisos los hace Supabase (ver supabase/schema.sql); el navegador solo recibe un
// token de acceso de una hora y con él lee calendarios y eventos directamente de Google.

export type GoogleAccount = { id: string; email: string; needsReauth: boolean };

export type GoogleCalendar = {
  accountId: string;
  calendarId: string;
  name: string;
  color: string; // hex, el que tiene en Google
  spaces: Space[]; // secciones donde se ven sus eventos
};

export type CalendarEvent = {
  id: string;
  calendar: GoogleCalendar;
  title: string;
  allDay: boolean;
  start: Date; // todo el día: a las 00:00 del primer día
  end: Date; // todo el día: a las 00:00 del día siguiente al último
  link?: string;
  location?: string;
};

const SCOPES = ["openid", "email", "https://www.googleapis.com/auth/calendar.readonly"];
const STATE_KEY = "donet.googleOAuth";
const REOPEN_KEY = "donet.reopenSettings";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
export const googleRedirectUri = () => `${window.location.origin}${basePath}/google/`;

// ID de cliente guardado en Supabase; null = falta configurar Google.
export async function fetchGoogleClientId(): Promise<string | null> {
  const { data, error } = await supabase!.rpc("google_client_id");
  if (error) throw error;
  return (data as string | null) || null;
}

// Va a Google a elegir cuenta y dar permiso. Vuelve a /google/, que termina la conexión
// y regresa a `returnTo` con Ajustes abierto.
export function startGoogleConnect(clientId: string, returnTo: string, loginHint?: string) {
  const state = crypto.randomUUID();
  sessionStorage.setItem(STATE_KEY, JSON.stringify({ state, returnTo }));
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: googleRedirectUri(),
    response_type: "code",
    scope: SCOPES.join(" "),
    access_type: "offline",
    // consent: así Google siempre devuelve el permiso duradero (refresh token).
    prompt: "consent select_account",
    include_granted_scopes: "true",
    state,
  });
  if (loginHint) params.set("login_hint", loginHint);
  window.location.assign(`https://accounts.google.com/o/oauth2/v2/auth?${params}`);
}

// Comprueba que la vuelta de Google es la que se pidió desde aquí. Devuelve adónde volver.
export function takeGoogleState(state: string | null): string | null {
  const saved = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!saved || !state) return null;
  try {
    const parsed = JSON.parse(saved) as { state: string; returnTo: string };
    return parsed.state === state ? parsed.returnTo : null;
  } catch {
    return null;
  }
}

export async function connectGoogleAccount(code: string) {
  const { error } = await supabase!.rpc("google_connect", { code, redirect_uri: googleRedirectUri() });
  if (error) throw error;
}

export const requestReopenSettings = () => sessionStorage.setItem(REOPEN_KEY, "1");
export function consumeReopenSettings() {
  const v = sessionStorage.getItem(REOPEN_KEY);
  sessionStorage.removeItem(REOPEN_KEY);
  return v === "1";
}

export async function disconnectGoogleAccount(id: string) {
  const { error } = await supabase!.rpc("google_disconnect", { account: id });
  if (error) throw error;
  tokens.delete(id);
}

export async function fetchGoogleAccounts(): Promise<GoogleAccount[]> {
  const { data, error } = await supabase!.from("google_accounts").select("id, email, needs_reauth").order("created_at");
  if (error) throw error;
  return (data as { id: string; email: string; needs_reauth: boolean }[]).map((r) => ({
    id: r.id,
    email: r.email,
    needsReauth: r.needs_reauth,
  }));
}

type CalendarRow = { account_id: string; calendar_id: string; name: string; color: string; spaces: Space[] };
const fromCalendarRow = (r: CalendarRow): GoogleCalendar => ({
  accountId: r.account_id,
  calendarId: r.calendar_id,
  name: r.name,
  color: r.color,
  spaces: r.spaces ?? [],
});

export async function fetchSavedCalendars(): Promise<GoogleCalendar[]> {
  const { data, error } = await supabase!
    .from("google_calendars")
    .select("account_id, calendar_id, name, color, spaces")
    .order("name");
  if (error) throw error;
  return (data as CalendarRow[]).map(fromCalendarRow);
}

export async function setCalendarSpaces(c: GoogleCalendar, spaces: Space[]) {
  const { error } = await supabase!
    .from("google_calendars")
    .update({ spaces })
    .eq("account_id", c.accountId)
    .eq("calendar_id", c.calendarId);
  if (error) throw error;
}

export class ReauthError extends Error {}

// Tokens de acceso en memoria, por cuenta, hasta poco antes de que caduquen.
const tokens = new Map<string, { token: string; expires: number }>();

async function accessToken(accountId: string): Promise<string> {
  const cached = tokens.get(accountId);
  if (cached && cached.expires - Date.now() > 60_000) return cached.token;
  const { data, error } = await supabase!.rpc("google_access_token", { account: accountId });
  if (error) throw error;
  const res = data as { access_token?: string; expires_at?: string; error?: string };
  if (res.error === "reauth" || !res.access_token) throw new ReauthError();
  tokens.set(accountId, { token: res.access_token, expires: Date.parse(res.expires_at!) });
  return res.access_token;
}

async function googleGet<T>(accountId: string, path: string, params: Record<string, string> = {}): Promise<T> {
  const token = await accessToken(accountId);
  const url = `https://www.googleapis.com/calendar/v3/${path}?${new URLSearchParams(params)}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (res.status === 401) {
    tokens.delete(accountId);
    throw new ReauthError();
  }
  if (!res.ok) throw new Error(`Google ${res.status}`);
  return res.json() as Promise<T>;
}

type ApiCalendar = { id: string; summary: string; summaryOverride?: string; backgroundColor?: string; primary?: boolean };

// Lee de Google los calendarios de la cuenta y los guarda: añade los nuevos (sin mostrar),
// actualiza nombre y color, y quita los que ya no están. Respeta lo elegido en cada uno.
export async function syncAccountCalendars(account: GoogleAccount, saved: GoogleCalendar[]): Promise<GoogleCalendar[]> {
  const items: ApiCalendar[] = [];
  let pageToken: string | undefined;
  do {
    const page = await googleGet<{ items: ApiCalendar[]; nextPageToken?: string }>(account.id, "users/me/calendarList", {
      maxResults: "250",
      ...(pageToken ? { pageToken } : {}),
    });
    items.push(...(page.items ?? []));
    pageToken = page.nextPageToken;
  } while (pageToken);

  const mine = saved.filter((c) => c.accountId === account.id);
  const next: GoogleCalendar[] = items
    // El principal primero; el resto, por nombre.
    .sort((a, b) => Number(!!b.primary) - Number(!!a.primary) || (a.summaryOverride ?? a.summary).localeCompare(b.summaryOverride ?? b.summary, "es"))
    .map((it) => ({
      accountId: account.id,
      calendarId: it.id,
      // El principal se llama como el email: mejor «Principal».
      name: it.primary ? "Principal" : (it.summaryOverride ?? it.summary),
      color: it.backgroundColor ?? "#8b919c",
      spaces: mine.find((c) => c.calendarId === it.id)?.spaces ?? [],
    }));

  if (next.length) {
    const { error } = await supabase!.from("google_calendars").upsert(
      next.map((c) => ({ account_id: c.accountId, calendar_id: c.calendarId, name: c.name, color: c.color, spaces: c.spaces })),
      { onConflict: "account_id,calendar_id" },
    );
    if (error) throw error;
  }
  const gone = mine.filter((c) => !next.some((n) => n.calendarId === c.calendarId)).map((c) => c.calendarId);
  if (gone.length) {
    const { error } = await supabase!.from("google_calendars").delete().eq("account_id", account.id).in("calendar_id", gone);
    if (error) throw error;
  }
  return next;
}

type ApiEvent = {
  id: string;
  status?: string;
  summary?: string;
  htmlLink?: string;
  location?: string;
  start: { date?: string; dateTime?: string };
  end: { date?: string; dateTime?: string };
  attendees?: { self?: boolean; responseStatus?: string }[];
};

const localDate = (ymd: string) => new Date(ymd + "T00:00");

// Eventos de un calendario entre dos instantes (las repeticiones, ya desplegadas).
// Se saltan los cancelados y los que se han rechazado.
export async function fetchCalendarEvents(calendar: GoogleCalendar, from: Date, to: Date): Promise<CalendarEvent[]> {
  const out: CalendarEvent[] = [];
  let pageToken: string | undefined;
  do {
    const page = await googleGet<{ items: ApiEvent[]; nextPageToken?: string }>(
      calendar.accountId,
      `calendars/${encodeURIComponent(calendar.calendarId)}/events`,
      {
        timeMin: from.toISOString(),
        timeMax: to.toISOString(),
        singleEvents: "true",
        orderBy: "startTime",
        maxResults: "250",
        ...(pageToken ? { pageToken } : {}),
      },
    );
    for (const e of page.items ?? []) {
      if (e.status === "cancelled") continue;
      if (e.attendees?.some((a) => a.self && a.responseStatus === "declined")) continue;
      const allDay = !!e.start.date;
      out.push({
        id: `${calendar.accountId}:${calendar.calendarId}:${e.id}`,
        calendar,
        title: e.summary?.trim() || "(Sin título)",
        allDay,
        start: allDay ? localDate(e.start.date!) : new Date(e.start.dateTime!),
        end: allDay ? localDate(e.end.date!) : new Date(e.end.dateTime!),
        link: e.htmlLink,
        location: e.location,
      });
    }
    pageToken = page.nextPageToken;
  } while (pageToken);
  return out;
}

const dayKey = (d: Date) => d.toLocaleDateString("sv-SE");

// Días (YYYY-MM-DD) en los que se ve un evento: todos los que toca, sin contar el
// día en que termina si acaba justo a medianoche.
export function eventDays(e: CalendarEvent): string[] {
  const days: string[] = [];
  const last = new Date(e.end.getTime() - 1);
  const d = new Date(e.start);
  d.setHours(0, 0, 0, 0);
  if (last < d) return [dayKey(d)];
  while (d <= last) {
    days.push(dayKey(d));
    d.setDate(d.getDate() + 1);
  }
  return days;
}

const hm = (d: Date) => d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });

// «Todo el día», «10:00 – 11:30», o para los que cruzan días, desde/hasta cuándo.
export function eventTimeLabel(e: CalendarEvent, day: string): string {
  if (e.allDay) return "Todo el día";
  const startDay = dayKey(e.start);
  const endDay = dayKey(new Date(e.end.getTime() - 1));
  if (startDay === endDay) return e.end.getTime() === e.start.getTime() ? hm(e.start) : `${hm(e.start)} – ${hm(e.end)}`;
  if (day === startDay) return `Desde ${hm(e.start)}`;
  if (day === endDay) return `Hasta ${hm(e.end)}`;
  return "Todo el día";
}

// Orden dentro de un día: primero los de todo el día, luego por hora de inicio.
export function sortEventsForDay(list: CalendarEvent[], day: string): CalendarEvent[] {
  const timed = (e: CalendarEvent) => !e.allDay && dayKey(e.start) === day;
  return [...list].sort(
    (a, b) =>
      Number(timed(a)) - Number(timed(b)) ||
      a.start.getTime() - b.start.getTime() ||
      a.title.localeCompare(b.title, "es"),
  );
}
