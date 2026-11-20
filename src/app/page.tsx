"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Landing from "@/components/Landing";
import { supabase } from "@/lib/supabase";
import { loadSpace, spacePath } from "@/lib/tasks";

// La dirección principal: con sesión lleva a la última sección abierta (Personal
// la primera vez); sin sesión muestra la portada que explica qué es doneT.
export default function Home() {
  const router = useRouter();
  const [guest, setGuest] = useState(false);

  useEffect(() => {
    const enter = () => router.replace(spacePath(loadSpace()));
    // Sin Supabase configurado, la sección muestra la pantalla de configuración.
    if (!supabase) return enter();
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      if (data.session) enter();
      else setGuest(true);
    });
    return () => {
      active = false;
    };
  }, [router]);

  return guest ? <Landing /> : <div className="min-h-dvh" />;
}
