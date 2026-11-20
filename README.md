# doneT

Mi gestor de tareas y proyectos personal, inspirado en Todoist y adaptado a mí. Sí, el nombre viene del donete.

Está publicado en GitHub Pages: https://m0k0h.github.io/donet/

## Funcionalidades

### Portada y cuenta
- **Portada** en la dirección principal para quien no ha iniciado sesión: explica qué es doneT y lleva a **Iniciar sesión** o **Crear cuenta**. Con sesión, la dirección principal lleva directamente a la última sección abierta
- Cuenta de usuario y sincronización entre dispositivos con Supabase (obligatorio: sin configurar, la app no arranca)
- Página pública de [política de privacidad](https://m0k0h.github.io/donet/privacidad/)

### Secciones y vistas
- Dos secciones, **Personal** y **Laboral**, cada una con su dirección propia (`/personal` y `/laboral`), sus proyectos, etiquetas y calendarios
- Vistas **Entrada**, **Hoy**, **Próximo** y **Completadas**
- **Hoy** muestra los eventos del día encima de las tareas
- **Próximo** va día a día, con eventos y tareas juntos; los eventos, solo de los próximos 7 días y con un fondo propio para distinguirlos
- En **Hoy** y **Próximo** cada tarea se ve con sus **subtareas desplegables**; pulsar una tarea lleva a su proyecto (o a Entrada) y la resalta allí

### Tareas y proyectos
- Crear, completar y borrar tareas, con fecha, hora opcional y prioridad (P1–P4)
- Dos formas de crear tareas: **rápida** (solo el texto) y **completa** (descripción, fecha, prioridad, sección y proyecto)
- **Fechas y horas en lenguaje natural**: «mañana», «el viernes», «el próximo lunes», «el 1 de diciembre», «15/3», «en 2 semanas», «este finde», «a las 10», «a las 9 de la noche», «9 AM»… Se pone esa fecha y hora y se quita del texto; si no era una fecha, se descarta con la ✕
- **Proyectos** con color opcional y anidables, en árbol en la barra lateral. Las tareas sin proyecto van a **Entrada**
- **Subtareas** a cualquier profundidad, plegables, con las completadas ocultas por defecto
- **Etiquetas** y **comentarios** en las tareas
- Todo se puede editar después: tareas (también moverlas de proyecto o sección, con sus subtareas) y proyectos
- Las completadas se despliegan al final de cada lista con «Mostrar N completadas»

### Calendarios de Google
- En Ajustes se conectan una o varias cuentas de Google (solo lectura) y, de cada calendario, se elige si sus eventos se ven en Personal, en Laboral o en las dos
- Los eventos salen en **Hoy** y **Próximo**; pulsar uno lo abre en Google Calendar
- Botón **Ocultar eventos** / **Mostrar eventos** en Hoy y Próximo, que se recuerda en cada navegador

### Listas de la compra
- Integradas en Personal, con el número de cosas por comprar
- Se comparten con un enlace (caduca en 7 días) y los cambios se ven al momento en todos los móviles
- Lo que hay por comprar se agrupa por **secciones del súper** (fruta y verdura, carne, lácteos…) en el orden de la tienda. Se clasifica solo con un diccionario; si mueves un artículo de sección al editarlo, la lista lo recuerda para la próxima vez
- Cantidad y nota opcionales, aviso si algo ya está en la lista, y «Terminar compra» quita lo que ya está en el carro

### Diseño
- Barra lateral en escritorio; en móvil, navegación inferior y botón flotante para añadir
- Identidad propia: logo, tipografía Outfit, magenta en Personal y azul marino en Laboral, modo claro y oscuro

## Próximos pasos

- [x] Etiquetas
- [x] Fechas en lenguaje natural ("mañana a las 10")
- [x] Calendarios de Google
- [ ] Tareas recurrentes
- [ ] Instalable como app (PWA)

## Stack

- [Next.js](https://nextjs.org/) 15 (App Router) con exportación estática (`output: "export"`): no hay servidor, se publica en GitHub Pages
- React 19 · TypeScript · Tailwind CSS 4
- [Supabase](https://supabase.com/): autenticación, base de datos Postgres con seguridad por filas, tiempo real y Vault para los secretos de Google
- GitHub Actions: lint, build y despliegue a GitHub Pages en cada push a `main` (`.github/workflows/deploy.yml`)

## Desarrollo

```bash
npm install
cp .env.example .env.local   # y rellena las claves de Supabase
npm run dev
```

Abre http://localhost:3000.

`.env.local` necesita `NEXT_PUBLIC_SUPABASE_URL` y `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Sin ellas la app solo muestra «Falta configurar Supabase».

Con worktrees, `main` usa el puerto 3000 y cada worktree el primero libre entre 3001 y 3003 (ver `CLAUDE.md` y `.claude/launch.json`). Cada worktree necesita su propio `npm install`.

### Base de datos (Supabase)

1. Ejecuta `supabase/schema.sql` en el SQL Editor del proyecto de Supabase (crea las tablas de tareas, proyectos, etiquetas, comentarios, la compra compartida y las cuentas de Google, con seguridad por filas y tiempo real). Se puede volver a ejecutar sin perder datos cuando cambie.
2. Copia `.env.example` a `.env.local` y rellena la clave publicable.

Al iniciar sesión por primera vez, las tareas guardadas en el navegador se suben a la cuenta.

### Calendarios de Google

doneT es una web estática, así que el intercambio de permisos con Google lo hace Supabase (funciones de `supabase/schema.sql` con la extensión `http`). El secreto de Google y los permisos de cada cuenta se quedan en la base de datos; el navegador solo recibe tokens de una hora para leer los calendarios.

1. En [Google Cloud Console](https://console.cloud.google.com/), crea un proyecto y activa la **Google Calendar API** (APIs y servicios → Biblioteca).
2. Pantalla de consentimiento OAuth (Google Auth Platform): tipo **Externo**, añade el permiso `.../auth/calendar.readonly` y **publica la app** («En producción»). En «Prueba», Google retira el permiso a los 7 días y habría que reconectar las cuentas cada semana. Como no está verificada, al conectar Google avisa de que la app no está verificada: «Configuración avanzada» → «Ir a doneT».
3. Clientes → Crear cliente → **Aplicación web**, con estas URI de redirección autorizadas:
   - `https://m0k0h.github.io/donet/google/`
   - `http://localhost:3000/google/`, `http://localhost:3001/google/`, `http://localhost:3002/google/` y `http://localhost:3003/google/` (main y worktrees)
4. Ejecuta `supabase/schema.sql` de nuevo y guarda el cliente en Vault (SQL Editor):
   ```sql
   select vault.create_secret('<ID de cliente>', 'google_client_id');
   select vault.create_secret('<secreto de cliente>', 'google_client_secret');
   ```
5. En doneT: Ajustes → **Añadir cuenta de Google**, y marca en cada calendario las secciones donde quieres verlo.

## Estructura

```
src/
  app/
    page.tsx            Dirección principal: portada sin sesión, o a la última sección con sesión
    [space]/page.tsx    /personal y /laboral: la app de tareas
    compra/             Entrada a la Compra y enlaces de invitación (/compra/?unirse=…)
    google/             Vuelta de Google al conectar una cuenta
    privacidad/         Política de privacidad
    layout.tsx, globals.css
  components/
    Landing.tsx         Portada pública
    AuthScreen.tsx      Inicio de sesión y registro
    TaskApp.tsx         La app: vistas, listas, barra lateral y navegación
    CalendarEvents.tsx, GoogleCalendars.tsx, ShoppingPanel.tsx, TaskDialog.tsx…
    Logo.tsx, icons.tsx
  lib/
    supabase.ts         Cliente y consultas a Supabase
    tasks.ts            Tipos y lógica de tareas, proyectos y secciones
    naturalDate.ts      Fechas y horas en lenguaje natural
    google.ts           Calendarios y eventos de Google
    shopping.ts         Listas de la compra
    sections.ts         Secciones del súper y clasificación de artículos
    theme.ts            Modo claro y oscuro
supabase/schema.sql     Esquema completo de la base de datos
```
