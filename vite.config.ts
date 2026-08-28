import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  base: "/pilot-logbook/",
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["icons/icon-192.png", "icons/icon-512.png"],
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true
      },
      manifest: {
        name: "Pilot Logbook",
        short_name: "Logbook",
        description: "Personal pilot flight logbook",
        theme_color: "#0b3d91",
        background_color: "#ffffff",
        display: "standalone",
        start_url: "/pilot-logbook/",
        scope: "/pilot-logbook/",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" }
        ]
      }
    })
  ],
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"]
  }
});
