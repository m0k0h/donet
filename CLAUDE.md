# doneT

## Preview local

- `main` (la carpeta `repo/`) usa siempre el puerto 3000: configuración `donet-dev` de `.claude/launch.json`.
- Cada worktree usa el primer puerto libre entre 3001, 3002 y 3003 (`donet-dev-3001`, `donet-dev-3002`, `donet-dev-3003`). Antes de arrancar, comprueba cuáles están ocupados (`lsof -nP -iTCP:3001 -sTCP:LISTEN`, etc.) y nunca arranques un worktree en el 3000.
- En un worktree nuevo, ejecuta `npm install` antes del primer arranque: `node_modules` no se comparte.
- `.env.local` (claves de Supabase) se copia a cada worktree gracias a `.worktreeinclude`. Sin esas claves la app solo muestra "Falta configurar Supabase".
- Dile al usuario en qué puerto ha quedado la preview de su rama.

## Supabase

Local, worktrees y nube usan el mismo proyecto de Supabase mientras se desarrolla; es intencionado.
