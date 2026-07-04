import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

// La app vive en localStorage del teléfono y debe poder instalarse y abrirse
// sin internet (PWA). El service worker cachea el shell de la app.
export default defineConfig({
  base: "./",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      // El nuevo service worker toma control de inmediato (sin esperar a que se
      // cierren todas las pestañas) y limpia cachés viejas → el build nuevo
      // reemplaza al viejo en la PWA instalada, evitando quedarse con una versión
      // vieja pegada en el teléfono.
      workbox: {
        clientsClaim: true,
        skipWaiting: true,
        cleanupOutdatedCaches: true,
      },
      manifest: {
        name: "Ruta · OnTrac",
        short_name: "Ruta",
        description:
          "Códigos de acceso de la ruta y seguimiento de ganancias para OnTrac",
        lang: "es",
        theme_color: "#0A0A0B",
        background_color: "#0A0A0B",
        display: "standalone",
        orientation: "portrait",
        // Rutas relativas para que funcione en cualquier subcarpeta (p. ej.
        // GitHub Pages /Ruta-/). Se resuelven contra la ubicación del manifest.
        start_url: ".",
        scope: "./",
        icons: [
          { src: "icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icon-512.png", sizes: "512x512", type: "image/png" },
          {
            src: "icon-512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable",
          },
        ],
      },
    }),
  ],
  test: {
    environment: "node",
    include: ["src/**/*.test.{js,jsx}"],
  },
});
