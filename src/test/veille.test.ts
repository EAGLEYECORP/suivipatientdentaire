import { describe, expect, it } from 'vitest';
import {
  DATE_VEILLE,
  EXPLICATION_MATURITE,
  LIBELLE_CATEGORIE,
  LIBELLE_MATURITE,
  MOIS_AVANT_PEREMPTION,
  VEILLE,
  ageDuFilEnMois,
  entreesNouvelles,
  filPerime,
  formaterMois,
  veilleTriee,
} from '@/data/veille';

describe('mise en forme des mois', () => {
  it('écrit le mois en toutes lettres', () => {
    expect(formaterMois('2025-12')).toBe('décembre 2025');
    expect(formaterMois('2026-01')).toBe('janvier 2026');
    expect(formaterMois('2026-08')).toBe('août 2026');
  });

  it('rend la chaîne telle quelle si elle n’est pas une date', () => {
    expect(formaterMois('bientôt')).toBe('bientôt');
    expect(formaterMois('2026-13')).toBe('2026-13');
  });
});

describe('âge du fil', () => {
  it('compte les mois écoulés depuis la clôture', () => {
    expect(ageDuFilEnMois(new Date('2026-10-15'), '2026-10')).toBe(0);
    expect(ageDuFilEnMois(new Date('2027-01-05'), '2026-10')).toBe(3);
    expect(ageDuFilEnMois(new Date('2027-10-01'), '2026-10')).toBe(12);
  });

  it('ne descend pas sous zéro si l’horloge du poste est en retard', () => {
    expect(ageDuFilEnMois(new Date('2026-01-01'), '2026-10')).toBe(0);
  });

  it('déclare le fil périmé au seuil, pas avant', () => {
    const veille = new Date('2027-03-15'); // 5 mois après 2026-10
    const apres = new Date('2027-04-15'); // 6 mois
    expect(ageDuFilEnMois(veille, '2026-10')).toBe(MOIS_AVANT_PEREMPTION - 1);
    expect(filPerime(veille)).toBe(false);
    expect(filPerime(apres)).toBe(true);
  });
});

describe('entrées nouvelles', () => {
  it('ne signale rien à la première visite', () => {
    expect(entreesNouvelles(null).size).toBe(0);
  });

  it('retient ce qui est postérieur à la dernière visite', () => {
    const nouvelles = entreesNouvelles('2026-01');
    for (const e of VEILLE) {
      expect(nouvelles.has(e.id)).toBe(e.date > '2026-01');
    }
    expect(nouvelles.size).toBeGreaterThan(0);
  });

  it('ne signale rien quand la visite est postérieure à tout', () => {
    expect(entreesNouvelles('2099-01').size).toBe(0);
  });
});

describe('tri', () => {
  it('place les entrées les plus récentes en tête', () => {
    const dates = veilleTriee().map((e) => e.date);
    expect([...dates].sort((a, b) => b.localeCompare(a))).toEqual(dates);
  });

  it('ne modifie pas le tableau d’origine', () => {
    const avant = VEILLE.map((e) => e.id);
    veilleTriee();
    expect(VEILLE.map((e) => e.id)).toEqual(avant);
  });
});

/*
 * La règle éditoriale tenue par le code plutôt que par la discipline.
 *
 * Une veille destinée à des cliniciens ne vaut que par ses sources et par
 * ce qu'elle avoue ne pas savoir. Ces assertions échouent dès qu'une entrée
 * future est ajoutée sans réserve ou sans référence.
 */
describe('règle éditoriale', () => {
  it('donne une réserve à chaque entrée', () => {
    for (const e of VEILLE) {
      expect(e.reserve.trim().length, `entrée « ${e.id} » sans réserve`).toBeGreaterThan(20);
    }
  });

  it('donne au moins une source vérifiable à chaque entrée', () => {
    for (const e of VEILLE) {
      expect(e.sources.length, `entrée « ${e.id} » sans source`).toBeGreaterThan(0);
      for (const s of e.sources) {
        expect(s.url, `source de « ${e.id} »`).toMatch(/^https:\/\//);
        expect(s.titre.trim().length).toBeGreaterThan(0);
      }
    }
  });

  it('remplit le résumé et la conséquence', () => {
    for (const e of VEILLE) {
      expect(e.resume.trim().length, e.id).toBeGreaterThan(40);
      expect(e.consequence.trim().length, e.id).toBeGreaterThan(20);
    }
  });

  it('date chaque entrée au format attendu, sans dépasser la clôture', () => {
    for (const e of VEILLE) {
      expect(e.date, e.id).toMatch(/^\d{4}-(0[1-9]|1[0-2])$/);
      expect(e.date.localeCompare(DATE_VEILLE), `« ${e.id} » postérieure à la clôture`).toBeLessThanOrEqual(0);
    }
  });

  it('n’attribue pas deux fois le même identifiant', () => {
    expect(new Set(VEILLE.map((e) => e.id)).size).toBe(VEILLE.length);
  });

  it('traduit chaque catégorie et chaque maturité employées', () => {
    for (const e of VEILLE) {
      expect(LIBELLE_CATEGORIE[e.categorie], e.id).toBeTruthy();
      expect(LIBELLE_MATURITE[e.maturite], e.id).toBeTruthy();
      expect(EXPLICATION_MATURITE[e.maturite], e.id).toBeTruthy();
    }
  });
});
