/**
 * Injecte la liste des ressources compilées dans le service worker.
 *
 * Les noms de fichiers produits par Vite contiennent un hachage : ils ne sont
 * connus qu'après la compilation. Sans cette étape, le service worker ne met
 * en cache que la coquille et l'application reste blanche hors ligne tant
 * qu'une seconde visite n'a pas peuplé le cache.
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

const DIST = 'dist';
const EXTENSIONS = ['.js', '.css', '.html', '.png', '.svg', '.webmanifest', '.woff2'];

function lister(repertoire) {
  const sorties = [];
  for (const entree of readdirSync(repertoire)) {
    const chemin = join(repertoire, entree);
    if (statSync(chemin).isDirectory()) sorties.push(...lister(chemin));
    else if (EXTENSIONS.some((e) => entree.endsWith(e))) sorties.push(chemin);
  }
  return sorties;
}

const fichiers = lister(DIST)
  .map((f) => `./${relative(DIST, f).split('\\').join('/')}`)
  .filter((f) => f !== './sw.js')
  // Les visuels de la vitrine n'ont pas à occuper le cache hors ligne du
  // poste clinique : la page publique se consulte en ligne, l'application
  // doit fonctionner sans réseau. Son document reste précaché, pas ses images.
  .filter((f) => !f.startsWith('./vitrine/'))
  .sort();

const empreinte = createHash('sha256').update(fichiers.join('|')).digest('hex').slice(0, 10);

const MARQUE_CACHE = "const CACHE = 'suivi-dentaire-v1';";
const MARQUE_COQUILLE =
  "const COQUILLE = ['./', './index.html', './app.html', './manifest.webmanifest', './favicon.svg'];";

const chemin = join(DIST, 'sw.js');
const origine = readFileSync(chemin, 'utf8');

/*
 * Ces deux remplacements portent sur du texte littéral. Si `public/sw.js`
 * évolue sans que ces repères soient mis à jour, le remplacement ne trouve
 * rien, ne signale rien, et l'application s'affiche blanche à la première
 * visite hors ligne. L'échec doit donc être bruyant.
 */
for (const marque of [MARQUE_CACHE, MARQUE_COQUILLE]) {
  if (origine.includes(marque)) continue;
  console.error(`\npost-build : repère introuvable dans dist/sw.js\n  attendu : ${marque}\n`);
  console.error('Le précache ne peut pas être injecté. Alignez le repère sur public/sw.js.');
  process.exit(1);
}

const source = origine
  .replace(MARQUE_CACHE, `const CACHE = 'suivi-dentaire-${empreinte}';`)
  .replace(MARQUE_COQUILLE, `const COQUILLE = ${JSON.stringify(['./', ...fichiers])};`);

writeFileSync(chemin, source);
console.log(`service worker : ${fichiers.length} ressources précachées (cache ${empreinte})`);
