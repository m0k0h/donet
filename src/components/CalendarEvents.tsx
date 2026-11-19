"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  eventDays,
  eventTimeLabel,
  fetchCalendarEvents,
  fetchSavedCalendars,
  sortEventsForDay,
  type CalendarEvent,
  type GoogleCalendar,
} from "@/lib/google";
import type { Space } from "@/lib/tasks";

// Días hacia delante que se leen de Google para Hoy y Próximo.
export const EVENT_DAYS = 30;
// Se vuelve a leer al volver a la app si han pasado estos minutos.
const STALE_MS = 5 * 60_000;

// Eventos de los calendarios elegidos (en alguna sección), de hoy a EVENT_DAYS días.
// Si una cuenta falla, sus eventos no salen y el resto sí.
export function useCalendarEvents(userId: string | null | undefined) {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const loadedAt = useRef(0);
  const run = useRef(0);

  const reload = useCallback(async () => {
    if (!userId) {
      setEvents([]);
      return;
    }
    const id = ++run.current;
    loadedAt.current = Date.now();
    let calendars: GoogleCalendar[];
    try {
      calendars = (await fetchSavedCalendars()).filter((c) => c.spaces.length);
    } catch {
      return; // Sin las tablas de Google, la app sigue igual.
    }
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from);
    to.setDate(to.getDate() + EVENT_DAYS + 1);
    const lists = await Promise.all(calendars.map((c) => fetchCalendarEvents(c, from, to).catch(() => [])));
    if (id === run.current) setEvents(lists.flat());
  }, [userId]);

  useEffect(() => {
    reload();
  }, [reload]);

  // Al volver a la pestaña (o a la app en el móvil), si los datos son viejos.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > STALE_MS) reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, [reload]);

  return { events, reload };
}

// Eventos de una sección agrupados por día (YYYY-MM-DD), ya ordenados.
export function eventsByDay(events: CalendarEvent[], space: Space): Map<string, CalendarEvent[]> {
  const byDay = new Map<string, CalendarEvent[]>();
  for (const e of events) {
    if (!e.calendar.spaces.includes(space)) continue;
    for (const day of eventDays(e)) byDay.set(day, [...(byDay.get(day) ?? []), e]);
  }
  for (const [day, list] of byDay) byDay.set(day, sortEventsForDay(list, day));
  return byDay;
}

// Lista de eventos de un día: hora, color del calendario y título; abre el evento en Google.
export function EventList({ events, day }: { events: CalendarEvent[]; day: string }) {
  if (!events.length) return null;
  return (
    <ul className="flex flex-col" aria-label="Eventos del calendario">
      {events.map((e) => (
        <li key={e.id}>
          <a
            href={e.link}
            target="_blank"
            rel="noopener noreferrer"
            title={`${e.calendar.name}${e.location ? ` · ${e.location}` : ""}`}
            className="flex min-h-11 items-center gap-3 rounded-lg px-2 py-1.5 hover:bg-track"
          >
            <span aria-hidden="true" className="h-8 w-1 shrink-0 rounded-full" style={{ background: e.calendar.color }} />
            <span className="w-[92px] shrink-0 text-[13px] font-semibold tabular-nums text-muted">
              {eventTimeLabel(e, day)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px]">{e.title}</span>
              {e.location && <span className="block truncate text-[13px] text-muted">{e.location}</span>}
            </span>
          </a>
        </li>
      ))}
    </ul>
  );
}
