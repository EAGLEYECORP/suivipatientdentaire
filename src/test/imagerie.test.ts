import { beforeEach, describe, expect, it } from 'vitest';
import 'fake-indexeddb/auto';
import { creerCoffre } from '@/lib/crypto';
import {
  ID_VIGNETTE,
  enregistrerFichier,
  indexedDbDisponible,
  libelleFichier,
  listerFichiers,
  lireFichier,
  messageImport,
  messageRefus,
  purger,
  supprimerFichier,
  trierFichiers,
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

describe('tri des fichiers reçus', () => {
  const fichier = (nom: string, type: string) => new File([new Uint8Array([1, 2, 3])], nom, { type });

  it('garde les images et nomme les fichiers écartés', () => {
    const { images, refuses } = trierFichiers([
      fichier('retro-16.png', 'image/png'),
      fichier('compte-rendu.pdf', 'application/pdf'),
      fichier('pano.jpg', 'image/jpeg'),
      fichier('capteur.dcm', ''),
    ]);
    expect(images.map((f) => f.name)).toEqual(['retro-16.png', 'pano.jpg']);
    expect(refuses).toEqual(['compte-rendu.pdf', 'capteur.dcm']);
  });

  it('accepte une liste vide sans broncher', () => {
    expect(trierFichiers([])).toEqual({ images: [], refuses: [] });
  });

  it('nomme un fichier sans nom', () => {
    expect(trierFichiers([fichier('', 'application/pdf')]).refuses).toEqual(['fichier sans nom']);
  });
});

describe('message de refus', () => {
  it('ne dit rien quand rien n’est écarté', () => {
    expect(messageRefus([])).toBe('');
  });

  it('nomme le fichier quand il est seul', () => {
    expect(messageRefus(['bilan.pdf'])).toContain('bilan.pdf');
  });

  /*
   * Le défaut corrigé : l'ancienne version appelait setErreur par fichier,
   * si bien qu'un dépôt de cinq documents n'en signalait qu'un seul.
   */
  it('réunit tout un lot dans un seul message', () => {
    const message = messageRefus(['a.pdf', 'b.txt', 'c.zip']);
    expect(message).toContain('3 fichiers ignorés');
    expect(message).toContain('a.pdf');
    expect(message).toContain('b.txt');
    expect(message).toContain('c.zip');
  });
});

describe('libellé d’un cliché', () => {
  const quand = new Date('2026-10-11T14:32:00');
  const fichier = (nom: string) => new File([new Uint8Array([1])], nom, { type: 'image/png' });

  it('retire l’extension d’un nom parlant', () => {
    expect(libelleFichier(fichier('retro-16-17.png'), quand)).toBe('retro-16-17');
  });

  it('horodate les noms génériques du presse-papiers', () => {
    for (const nom of ['image.png', 'Image.png', 'image (2).png', 'untitled.png', 'sans-titre.png']) {
      expect(libelleFichier(fichier(nom), quand)).toBe('Cliché collé le 11/10/2026 à 14:32:00');
    }
  });

  it('horodate aussi un fichier sans nom', () => {
    expect(libelleFichier(fichier(''), quand)).toMatch(/^Cliché collé le /);
  });

  it('distingue deux collages séparés d’une seconde', () => {
    const a = libelleFichier(fichier('image.png'), new Date('2026-10-11T14:32:00'));
    const b = libelleFichier(fichier('image.png'), new Date('2026-10-11T14:32:01'));
    expect(a).not.toBe(b);
  });

  it('laisse intact un nom de capture daté par le système', () => {
    expect(libelleFichier(fichier('Screenshot 2026-10-11 at 14.32.png'), quand)).toBe(
      'Screenshot 2026-10-11 at 14.32',
    );
  });
});

describe('récapitulatif d’import', () => {
  it('se tait quand rien n’est entré', () => {
    expect(messageImport(0)).toBe('');
  });

  it('accorde le singulier et le pluriel', () => {
    expect(messageImport(1)).toBe('1 cliché importé.');
    expect(messageImport(4)).toBe('4 clichés importés.');
  });
});
