/**
 * Prépare les captures de la page vitrine.
 *
 * Les captures de `docs/` sont en PNG à 2880 px : utiles pour le dépôt,
 * beaucoup trop lourdes pour une page publique (400 à 700 Ko chacune). Ce
 * script en dérive des WebP à la largeur réellement affichée et les dépose
 * dans `public/vitrine/`, d'où la compilation les recopie telles quelles.
 *
 * Exécution manuelle : `node scripts/vitrine-images.mjs`. Les sorties sont
 * versionnées, le script n'entre donc pas dans `npm run build` et la
 * compilation reste sans dépendance native.
 */
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const SOURCE = 'docs';
const CIBLE = 'public/vitrine';

// Largeur de sortie choisie d'après la taille d'affichage réelle, doublée
// pour les écrans à forte densité.
const PLAN = [
  { entree: '21-arcade-complete.png', sortie: 'odontogramme.webp', largeur: 1120 },
  { entree: '06-charting-parodontal.png', sortie: 'parodontal.webp', largeur: 1440, hauteurMax: 810 },
  { entree: '22-profil-de-risque-complet.png', sortie: 'aide-decision.webp', largeur: 1440 },
  { entree: '04-remontee-temporelle.png', sortie: 'remontee.webp', largeur: 1100 },
  { entree: '08-devis-variantes.png', sortie: 'devis.webp', largeur: 1100 },
  { entree: '13-visionneuse.png', sortie: 'imagerie.webp', largeur: 1100 },
  { entree: '19-coffre-verrouille.png', sortie: 'coffre.webp', largeur: 1100 },
];

// Vignette de partage. Les réseaux sociaux attendent du PNG ou du JPEG en
// 1200x630 : le WebP n'est pas lu partout.
const PARTAGE = { entree: '22-profil-de-risque-complet.png', sortie: 'partage.png', largeur: 1200, hauteur: 630 };

mkdirSync(CIBLE, { recursive: true });

const ko = (chemin) => Math.round(statSync(chemin).size / 1024);

for (const { entree, sortie, largeur, hauteurMax } of PLAN) {
  const source = join(SOURCE, entree);
  const destination = join(CIBLE, sortie);

  let pipeline = sharp(readFileSync(source)).resize({ width: largeur, withoutEnlargement: true });

  // Les captures très hautes (charting parodontal, profil de risque) sont
  // recadrées par le haut : l'intérêt est dans l'en-tête du tableau, pas
  // dans le bas de page.
  if (hauteurMax) pipeline = pipeline.extract({ left: 0, top: 0, width: largeur, height: hauteurMax });

  const donnees = await pipeline.webp({ quality: 78, effort: 6 }).toBuffer();
  writeFileSync(destination, donnees);

  const { width, height } = await sharp(donnees).metadata();
  console.log(
    `${sortie.padEnd(20)} ${String(width).padStart(4)}x${String(height).toString().padEnd(4)}  ` +
      `${String(ko(source)).padStart(4)} Ko PNG -> ${String(ko(destination)).padStart(3)} Ko WebP`,
  );
}

const vignette = join(CIBLE, PARTAGE.sortie);
await sharp(readFileSync(join(SOURCE, PARTAGE.entree)))
  .resize({ width: PARTAGE.largeur, height: PARTAGE.hauteur, fit: 'cover', position: 'top' })
  .png({ compressionLevel: 9, palette: true })
  .toFile(vignette);
console.log(`${PARTAGE.sortie.padEnd(20)} ${PARTAGE.largeur}x${PARTAGE.hauteur}   vignette de partage, ${ko(vignette)} Ko`);
