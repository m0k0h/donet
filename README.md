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
- Todo se puede editar después: pulsa una tarea para cambiarla (o moverla de proyecto o sección, con sus subtareas) y usa el lápiz de un proyecto para renombrarlo, cambiarle el color, moverlo o borrarlo
- Las tareas creadas fuera de un proyecto van a **Entrada**
- **Fechas y horas en lenguaje natural**: escribe «mañana», «el viernes», «el próximo lunes», «el 1 de diciembre», «15/3», «en 2 semanas», «este finde»… y también la hora: «a las 10», «a las 21», «a las 9:30», «a las 9 de la noche», «a las 5 y media», «9 AM», «18:45». Se pone esa fecha y hora y se quita del texto. Si no era una fecha, se descarta con la ✕. Solo con hora, la tarea es para hoy (o mañana si esa hora ya ha pasado)
- Hora opcional en las tareas, también desde el formulario
- Las descripciones largas se despliegan en la lista con «Ver más», sin abrir la tarea
- Diseño adaptado: barra lateral en escritorio; en móvil, navegación inferior y botón flotante para añadir
- Identidad propia: logo, tipografía Outfit, magenta en Personal y azul marino en Laboral, modo claro y oscuro
- Cuenta de usuario y sincronización entre dispositivos con Supabase (obligatorio: sin configurar, la app no arranca)
- **Listas de la compra**, integradas en la app (destacadas antes de Proyectos y en la barra inferior del móvil, con el número de cosas por comprar). Todo el mundo empieza con «Mi lista»; al compartirla con un enlace (caduca en 7 días) pasa a llamarse «Compartida» («Compartida 2»…) y cualquiera puede renombrarla. Se puede tener varias, crear otra «Mi lista» y salir de una. Los cambios se ven al momento en todos los móviles; cantidad y nota opcionales, aviso si algo ya está en la lista, y «Terminar compra» quita lo que ya está en el carro
- **Calendarios de Google** (solo lectura): en Ajustes se conectan una o varias cuentas de Google y, de cada calendario, se elige si sus eventos se ven en Personal, en Laboral o en las dos. Los eventos salen en **Hoy** (encima de las tareas) y en **Próximo** (que ahora va día a día, con eventos y tareas juntos; los eventos, de los próximos 7 días). Pulsar un evento lo abre en Google Calendar

## Próximos pasos

- [ ] Etiquetas
- [x] Fechas en lenguaje natural ("mañana a las 10")
- [ ] Tareas recurrentes
- [ ] Instalable como app (PWA)

## Desarrollo

```bash
npm install
npm run dev
```

Abre http://localhost:3000.

### Base de datos (Supabase)

1. Ejecuta `supabase/schema.sql` en el SQL Editor del proyecto de Supabase (crea las tablas de tareas, proyectos y la compra compartida, con seguridad por filas y tiempo real). Se puede volver a ejecutar sin perder datos cuando cambie.
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

Stack: Next.js · TypeScript · Tailwind CSS
