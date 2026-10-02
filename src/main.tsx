import React from 'react';
import ReactDOM from 'react-dom/client';
import { App } from '@/App';
import '@/index.css';

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);

// Mise en cache de la coquille applicative : le cabinet doit pouvoir
// travailler même sans réseau. Le service worker n'est pas enregistré en
// développement, pour ne pas servir une version périmée.
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch((e) => {
      console.warn('Service worker non enregistré', e);
    });
  });
}
