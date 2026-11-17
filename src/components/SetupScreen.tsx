import Logo from "./Logo";

// Se muestra cuando faltan las variables de entorno de Supabase: sin ellas la app no funciona.
export default function SetupScreen() {
  return (
    <div data-space="personal" className="grid min-h-dvh place-items-center px-4">
      <div role="alert" className="flex w-full max-w-sm flex-col gap-4 rounded-xl bg-sunk p-6">
        <Logo size={28} surface="var(--sunk)" />
        <h1 className="text-xl font-extrabold tracking-[-0.02em]">Falta configurar Supabase</h1>
        <p className="text-sm text-ink-soft">
          Define <code className="font-semibold">NEXT_PUBLIC_SUPABASE_URL</code> y{" "}
          <code className="font-semibold">NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY</code>. En local, copia{" "}
          <code className="font-semibold">.env.example</code> a <code className="font-semibold">.env.local</code>,
          rellena la clave y reinicia el servidor.
        </p>
      </div>
    </div>
  );
}
