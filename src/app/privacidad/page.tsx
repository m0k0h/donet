import type { Metadata } from "next";
import Link from "next/link";
import Logo from "@/components/Logo";

export const metadata: Metadata = { title: "Privacidad · doneT" };

// Política de privacidad pública: Google la pide para dejar conectar calendarios.
export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[680px] flex-col gap-6 px-4 py-10 md:px-6">
      <Link href="/" aria-label="Volver a doneT" className="self-start">
        <Logo size={28} />
      </Link>
      <h1 className="text-3xl font-extrabold tracking-[-0.01em]">Política de privacidad</h1>
      <p className="text-sm text-muted">Última actualización: 19 de noviembre de 2026</p>

      <Section title="Qué es doneT">
        <p>
          doneT es un gestor de tareas personal. Para usarlo hace falta una cuenta; tus tareas, proyectos, etiquetas,
          comentarios y listas de la compra se guardan en Supabase para sincronizarlos entre tus dispositivos.
        </p>
      </Section>

      <Section title="Calendarios de Google">
        <p>
          Si lo decides tú, en Ajustes puedes conectar una o varias cuentas de Google para ver tus eventos junto a tus
          tareas. doneT pide únicamente permiso de <strong>solo lectura</strong> sobre tus calendarios
          (<code>calendar.readonly</code>) y tu dirección de correo, para saber qué cuenta has conectado.
        </p>
        <ul className="list-disc pl-5">
          <li>Se guardan: el correo de la cuenta, el permiso de acceso que da Google (cifrado y nunca visible en el navegador) y, de cada calendario, su nombre, su color y en qué sección quieres verlo.</li>
          <li>Los eventos no se guardan: se leen de Google al momento para mostrártelos y solo los ves tú.</li>
          <li>doneT nunca crea, modifica ni borra nada en tus calendarios.</li>
          <li>Los datos de Google no se venden, no se comparten con nadie, no se usan para publicidad ni para entrenar modelos de inteligencia artificial.</li>
        </ul>
        <p>
          El uso de la información recibida de las API de Google se ajusta a la{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent underline"
          >
            Política de datos de usuario de los servicios de API de Google
          </a>
          , incluidos los requisitos de uso limitado.
        </p>
      </Section>

      <Section title="Cómo quitar el acceso">
        <p>
          En Ajustes → Calendarios de Google, «Quitar» desconecta la cuenta: se retira el permiso en Google y se borran la
          cuenta y sus calendarios de doneT. También puedes retirarlo cuando quieras desde{" "}
          <a
            href="https://myaccount.google.com/permissions"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-accent underline"
          >
            los permisos de tu cuenta de Google
          </a>
          .
        </p>
      </Section>

      <Section title="Tus datos">
        <p>
          No se usan cookies de seguimiento ni analítica. Solo se usan las cookies necesarias para mantener la sesión
          iniciada.
        </p>
      </Section>
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 text-[15px] leading-relaxed">
      <h2 className="text-xl font-extrabold">{title}</h2>
      {children}
    </section>
  );
}
