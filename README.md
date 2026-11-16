# doneT

Mi gestor de tareas personal, inspirado en Todoist y adaptado a mí. Sí, el nombre viene del donete.

## Estado

Primera versión (MVP):
- Dos espacios separados, **Personal** y **Laboral**, con cambio rápido entre ellos
- Vistas **Entrada**, **Hoy** y **Próximo**
- Crear, completar y borrar tareas, con fecha y prioridad (P1–P4)
- Diseño adaptado: barra lateral en escritorio, navegación inferior en móvil
- Los datos se guardan en el navegador (`localStorage`)

## Próximos pasos

- [ ] Proyectos y etiquetas
- [ ] Fechas en lenguaje natural ("mañana a las 10")
- [ ] Tareas recurrentes
- [ ] Cuenta de usuario y sincronización entre dispositivos (Supabase)
- [ ] Instalable como app (PWA)

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

Stack: Next.js · TypeScript · Tailwind CSS
