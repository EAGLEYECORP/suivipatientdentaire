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
  .sort();

const empreinte = createHash('sha256').update(fichiers.join('|')).digest('hex').slice(0, 10);

const chemin = join(DIST, 'sw.js');
const source = readFileSync(chemin, 'utf8')
  .replace("const CACHE = 'suivi-dentaire-v1';", `const CACHE = 'suivi-dentaire-${empreinte}';`)
  .replace(
    "const COQUILLE = ['./', './index.html', './manifest.webmanifest', './favicon.svg'];",
    `const COQUILLE = ${JSON.stringify(['./', ...fichiers])};`,
  );

writeFileSync(chemin, source);
console.log(`service worker : ${fichiers.length} ressources précachées (cache ${empreinte})`);
