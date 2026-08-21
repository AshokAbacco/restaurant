import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),

    VitePWA({
      registerType: "autoUpdate",

      workbox: {
        maximumFileSizeToCacheInBytes: 10 * 1024 * 1024, // 10 MB

        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],

        // FIX: without this, a hard reload while offline on any deep
        // route (/pos, /kitchen, /menu, etc.) goes blank. This is a
        // single-page app — React Router owns those routes entirely
        // client-side, there's no real "/pos" page on the server. The
        // service worker only precached "/" (index.html) via
        // globPatterns above, so a navigation request to "/pos"
        // specifically had nothing cached to match and came back empty.
        // navigateFallback tells the service worker: for any browser
        // navigation (a real reload/URL entry, not a fetch() call) that
        // isn't already in the cache, just serve index.html — React
        // Router then mounts and renders /pos exactly like it does on a
        // normal online reload. navigateFallbackDenylist keeps this from
        // swallowing real API requests, which must still go to the
        // network (or the runtime cache below), never to index.html.
        navigateFallback: "/index.html",
        navigateFallbackDenylist: [/^\/api\//],

        runtimeCaching: [
          {
            urlPattern: ({ url, request }) =>
              request.method === "GET" &&
              /\/api\/(menu|categories|pos\/tables|pos\/tables\/floors|pos\/add-ons|pos\/kot\/display|pos\/orders)(\?|$)/.test(
                url.pathname + url.search,
              ),

            handler: "NetworkFirst",

            options: {
              cacheName: "reference-data-cache",

              networkTimeoutSeconds: 3,

              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24,
              },

              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },

      manifest: {
        name: "Restaurant ERP",
        short_name: "Restaurant ERP",

        theme_color: "#3FA34D",
        background_color: "#ffffff",

        display: "standalone",

        start_url: "/",

        icons: [
          {
            src: "/pwa-192x192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/pwa-512x512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },

      devOptions: {
        enabled: false,
      },
    }),
  ],
});
