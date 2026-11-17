"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { loadSpace, spacePath } from "@/lib/tasks";

// La dirección principal lleva a la última sección abierta (Personal la primera vez).
export default function Home() {
  const router = useRouter();
  useEffect(() => {
    router.replace(spacePath(loadSpace()));
  }, [router]);
  return <div className="min-h-dvh" />;
}
