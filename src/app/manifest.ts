import type { MetadataRoute } from "next";

// La app se exporta como web estática (output: "export").
export const dynamic = "force-static";

// En GitHub Pages la app vive en /donet: el manifest no lleva el prefijo solo.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

// Permite instalar doneT como app (Dock del Mac, pantalla de inicio del móvil).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "doneT",
    short_name: "doneT",
    description: "Mi gestor de tareas personal",
    id: `${basePath}/`,
    start_url: `${basePath}/`,
    scope: `${basePath}/`,
    display: "standalone",
    background_color: "#0a7f55",
    theme_color: "#0a7f55",
    icons: [
      { src: `${basePath}/icon-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${basePath}/icon-512.png`, sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: `${basePath}/icon-maskable-512.png`,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
