/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  base: './',
  build: {
    rollupOptions: {
      /*
       * Deux pages distinctes.
       *
       * `index.html` est la vitrine publique : du HTML servi tel quel, sans
       * React, indexable et peinte avant que le moindre script ne s'exécute.
       * `app.html` est le poste de travail clinique.
       *
       * app.html est volontairement un fichier voisin de index.html et non un
       * sous-répertoire : toutes les adresses relatives de l'application
       * (./assets, ./manifest.webmanifest, ./sw.js) continuent de résoudre, et
       * le service worker garde la racine pour portée.
       */
      input: {
        vitrine: path.resolve(__dirname, 'index.html'),
        application: path.resolve(__dirname, 'app.html'),
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
