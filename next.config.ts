import type { NextConfig } from "next";

// En GitHub Pages la app vive en /donet; en local, en la raíz.
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Exportación estática: doneT no necesita servidor (los datos están en el navegador).
  output: "export",
  basePath,
  trailingSlash: true,
  images: { unoptimized: true },
};

export default nextConfig;
