/*
 * Service worker : l'application doit rester utilisable sans réseau.
 *
 * Coquille applicative mise en cache à l'installation, puis cache-first sur
 * les ressources versionnées de la compilation (leur nom contient un hachage,
 * elles ne changent jamais sous un même nom). La navigation passe d'abord par
 * le réseau pour récupérer une nouvelle version, et retombe sur le cache hors
 * ligne.
 */
const CACHE = 'suivi-dentaire-v1';
const COQUILLE = ['./', './index.html', './manifest.webmanifest', './favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(COQUILLE))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((c) => c !== CACHE).map((c) => caches.delete(c))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const requete = e.request;
  if (requete.method !== 'GET') return;

  const url = new URL(requete.url);
  if (url.origin !== self.location.origin) return;

  if (requete.mode === 'navigate') {
    e.respondWith(
      fetch(requete)
        .then((reponse) => {
          const copie = reponse.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copie));
          return reponse;
        })
        .catch(() => caches.match('./index.html').then((r) => r ?? caches.match('./'))),
    );
    return;
  }

  e.respondWith(
    caches.match(requete).then((cachee) => {
      if (cachee) return cachee;
      return fetch(requete).then((reponse) => {
        if (reponse.ok && reponse.type === 'basic') {
          const copie = reponse.clone();
          caches.open(CACHE).then((c) => c.put(requete, copie));
        }
        return reponse;
      });
    }),
  );
});
