import { defineConfig } from 'vite';
import { paraglide } from "@inlang/paraglide-js-adapter-vite"
import solidPlugin from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';
import serveStatic from 'serve-static';

export default defineConfig(() => ({
  base: '/v2/',
  plugins: [
    solidPlugin(),
    paraglide({
      project: "./project.inlang", //Path to your inlang project
      outdir: "./src/generated-i18n", //Where you want the generated files to be placed
    }),
    VitePWA({
      // registerType: 'autoUpdate',
      injectRegister: null,
      manifest: {
        name: 'Soaring Meteo',
        description: 'Meteorology for soaring pilots',
        short_name: 'SoaringMeteoV2',
        start_url: '/v2/',
        theme_color: '#ffffff',
        icons: [
          {
            src: './favicoSoaringMeteo.scaled.png',
            size: '192x192',
            type: 'image/png'
          }
        ],
        display: 'fullscreen'
      }
    }),
    {
      name: 'serve-forecast-data',
      configureServer(server) {
        server.middlewares.use('/v2/data', serveStatic('../backend/target/forecast/data'))
      }
    },
    {
      name: 'serve-forecast-data-preview',
      configurePreviewServer(server) {
        server.middlewares.use('/v2/data', serveStatic('../backend/target/forecast/data'))
      }
    }
  ],
  server: {
    port: 3000
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks: {
          ol: ['ol'],
          solid: ['solid-js']
        }
      }
    },
  },
}));
