"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { requestOpenShopping, savePendingInvite } from "@/lib/shopping";
import { loadSpace, spacePath } from "@/lib/tasks";

// Guarda la invitación (si la hay) y abre la Compra en la última sección usada.
export default function OpenShopping() {
  const router = useRouter();
  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get("unirse");
    if (code) savePendingInvite(code.trim().toUpperCase());
    requestOpenShopping();
    router.replace(spacePath(loadSpace()));
  }, [router]);
  return <div className="min-h-dvh" />;
}
