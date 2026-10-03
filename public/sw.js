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
const COQUILLE = ['./', './index.html', './app.html', './manifest.webmanifest', './favicon.svg'];

/*
 * Le site porte deux documents : la vitrine publique à la racine et le poste
 * de travail sur app.html. Une navigation hors ligne doit retomber sur le bon
 * document, sinon « / » sert l'application et « /app.html » sert la page de
 * présentation.
 */
function coquilleDe(url) {
  return url.pathname.endsWith('/app.html') ? './app.html' : './index.html';
}

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
    const coquille = coquilleDe(url);
    e.respondWith(
      fetch(requete)
        .then((reponse) => {
          // Seules les réponses valides remplacent la coquille en cache : une
          // page d'erreur mise en cache condamnerait le hors-ligne.
          if (reponse.ok) {
            const copie = reponse.clone();
            caches.open(CACHE).then((c) => c.put(coquille, copie));
          }
          return reponse;
        })
        .catch(() => caches.match(coquille).then((r) => r ?? caches.match('./'))),
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
