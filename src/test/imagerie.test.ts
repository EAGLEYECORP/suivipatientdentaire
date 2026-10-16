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
  ID_ORIGINAL,
  messageImport,
  messageProblemes,
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

  it('répartit images, DICOM et refusés', () => {
    const { images, dicom, refuses } = trierFichiers([
      fichier('retro-16.png', 'image/png'),
      fichier('compte-rendu.pdf', 'application/pdf'),
      fichier('pano.jpg', 'image/jpeg'),
      fichier('capteur.dcm', ''),
    ]);
    expect(images.map((f) => f.name)).toEqual(['retro-16.png', 'pano.jpg']);
    expect(dicom.map((f) => f.name)).toEqual(['capteur.dcm']);
    expect(refuses).toEqual(['compte-rendu.pdf']);
  });

  /* Les navigateurs ne donnent pas de type MIME aux .dcm. */
  it('reconnaît un DICOM par l’extension comme par le type', () => {
    const { dicom } = trierFichiers([
      fichier('CAPTEUR.DCM', ''),
      fichier('sans-extension', 'application/dicom'),
      fichier('autre.bin', ''),
    ]);
    expect(dicom.map((f) => f.name)).toEqual(['CAPTEUR.DCM', 'sans-extension']);
  });

  it('accepte une liste vide sans broncher', () => {
    expect(trierFichiers([])).toEqual({ images: [], dicom: [], refuses: [] });
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

describe('message de problèmes', () => {
  it('se tait quand tout va bien', () => {
    expect(messageProblemes([], [])).toBe('');
  });

  it('réunit refus génériques et échecs DICOM', () => {
    const m = messageProblemes(
      ['bilan.pdf'],
      [{ nom: 'pano.dcm', raison: 'Ce DICOM est compressé en JPEG 2000.' }],
    );
    expect(m).toContain('bilan.pdf');
    expect(m).toContain('pano.dcm');
    expect(m).toContain('JPEG 2000');
    expect(m.split('\n')).toHaveLength(2);
  });

  it('donne une ligne par DICOM en échec', () => {
    const m = messageProblemes([], [
      { nom: 'a.dcm', raison: 'compressé.' },
      { nom: 'b.dcm', raison: 'illisible.' },
    ]);
    expect(m.split('\n')).toHaveLength(2);
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

describe('clé du fichier d’origine', () => {
  it('se dérive de l’identifiant du cliché', () => {
    expect(ID_ORIGINAL('img_7')).toBe('img_7-original');
    expect(ID_VIGNETTE('img_7')).toBe('img_7-vignette');
  });

  /*
   * La purge comparait les identifiants après avoir retiré « -vignette ».
   * Sans le même traitement pour « -original », chaque passage aurait
   * effacé les DICOM d'origine encore rattachés à un dossier.
   */
  it('survit à la purge quand le cliché est conservé', async () => {
    for (const id of await listerFichiers()) await supprimerFichier(id);
    const png = new Blob([new Uint8Array([1])], { type: 'image/png' });
    await enregistrerFichier('img_9', png, null);
    await enregistrerFichier(ID_VIGNETTE('img_9'), png, null);
    await enregistrerFichier(ID_ORIGINAL('img_9'), png, null);

    expect(await purger(['img_9'])).toBe(0);
    expect((await listerFichiers()).sort()).toEqual(
      ['img_9', 'img_9-original', 'img_9-vignette'].sort(),
    );
  });

  it('emporte l’original quand le cliché disparaît', async () => {
    expect(await purger([])).toBe(3);
    expect(await listerFichiers()).toEqual([]);
  });
});
