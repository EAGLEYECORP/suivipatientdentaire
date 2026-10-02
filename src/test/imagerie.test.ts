import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { creerCoffre } from '@/lib/crypto';
import {
  ID_VIGNETTE,
  enregistrerFichier,
  indexedDbDisponible,
  listerFichiers,
  lireFichier,
  purger,
  supprimerFichier,
} from '@/lib/imagerie';

const contenu = () => new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 1, 2, 3])], { type: 'image/png' });

async function octets(blob: Blob): Promise<number[]> {
  return Array.from(new Uint8Array(await blob.arrayBuffer()));
}

describe('stockage des images', () => {
  beforeEach(async () => {
    for (const id of await listerFichiers()) await supprimerFichier(id);
  });

  it('est disponible', () => {
    expect(indexedDbDisponible()).toBe(true);
  });

  it('fait un aller-retour en clair', async () => {
    await enregistrerFichier('img1', contenu(), null);
    const relu = await lireFichier('img1', null);
    expect(relu).not.toBeNull();
    expect(await octets(relu!)).toEqual(await octets(contenu()));
    expect(relu!.type).toBe('image/png');
  });

  it('retourne null pour une image absente', async () => {
    expect(await lireFichier('inconnu', null)).toBeNull();
  });

  it('chiffre le binaire quand le coffre est actif', async () => {
    const coffre = await creerCoffre('phrase du cabinet');
    await enregistrerFichier('img2', contenu(), coffre);

    // Relu avec la clé : identique à l'original.
    const relu = await lireFichier('img2', coffre);
    expect(await octets(relu!)).toEqual(await octets(contenu()));

    // Sans la clé : refus explicite, pas de fuite silencieuse.
    await expect(lireFichier('img2', null)).rejects.toThrow(/coffre/i);
  });

  it('refuse une mauvaise clé', async () => {
    const bon = await creerCoffre('bonne phrase');
    const mauvais = await creerCoffre('autre phrase');
    await enregistrerFichier('img3', contenu(), bon);
    await expect(lireFichier('img3', mauvais)).rejects.toThrow(/illisible|incorrecte/i);
  });

  it('supprime un fichier', async () => {
    await enregistrerFichier('img4', contenu(), null);
    await supprimerFichier('img4');
    expect(await lireFichier('img4', null)).toBeNull();
  });

  it('purge les binaires orphelins en conservant les vignettes utiles', async () => {
    await enregistrerFichier('garde', contenu(), null);
    await enregistrerFichier(ID_VIGNETTE('garde'), contenu(), null);
    await enregistrerFichier('orphelin', contenu(), null);
    await enregistrerFichier(ID_VIGNETTE('orphelin'), contenu(), null);

    const supprimes = await purger(['garde']);
    expect(supprimes).toBe(2);
    expect(await lireFichier('garde', null)).not.toBeNull();
    expect(await lireFichier(ID_VIGNETTE('garde'), null)).not.toBeNull();
    expect(await lireFichier('orphelin', null)).toBeNull();
  });
});
