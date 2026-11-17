# doneT

Mi gestor de tareas personal, inspirado en Todoist y adaptado a mí. Sí, el nombre viene del donete.

## Estado

Primera versión (MVP):
- Dos secciones fijas, **Personal** y **Laboral**, cada una con su dirección propia: `/personal` y `/laboral`. La dirección principal lleva a la última que abriste
- Vistas **Entrada**, **Hoy** y **Próximo**
- Crear, completar y borrar tareas, con fecha y prioridad (P1–P4)
- Dos formas de crear tareas: **rápida** (solo el texto) y **completa** (descripción, fecha, prioridad, sección y proyecto)
- **Proyectos** propios en cada sección, con color opcional y anidables (proyectos dentro de proyectos), en árbol en la barra lateral
- **Subtareas** a cualquier profundidad
- Las tareas creadas fuera de un proyecto van a **Entrada**
- Diseño adaptado: barra lateral en escritorio; en móvil, navegación inferior y botón flotante para añadir
- Identidad propia: logo, tipografía Outfit, magenta en Personal y azul marino en Laboral, modo claro y oscuro
- Cuenta de usuario y sincronización entre dispositivos con Supabase (obligatorio: sin configurar, la app no arranca)

## Próximos pasos

- [ ] Renombrar, mover y borrar proyectos
- [ ] Etiquetas
- [ ] Fechas en lenguaje natural ("mañana a las 10")
- [ ] Tareas recurrentes
- [ ] Instalable como app (PWA)

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

### Base de datos (Supabase)

1. Ejecuta `supabase/schema.sql` en el SQL Editor del proyecto de Supabase (crea las tablas `tasks` y `projects` con seguridad por filas). Se puede volver a ejecutar sin perder datos cuando cambie.
2. Copia `.env.example` a `.env.local` y rellena la clave publicable.

Al iniciar sesión por primera vez, las tareas guardadas en el navegador se suben a la cuenta.

Stack: Next.js · TypeScript · Tailwind CSS
