import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';
import { VitePWA } from 'vite-plugin-pwa';
import serveStatic from 'serve-static';

export default defineConfig(() => ({
  base: '/v2/',
  plugins: [
    solidPlugin(),
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
    }
  ],
  server: {
    port: 3000
  },
  build: {
    target: 'esnext'
  },
}));
