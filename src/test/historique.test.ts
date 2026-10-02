import { describe, expect, it } from 'vitest';
import type { DentEtat, EvenementJournal } from '@/types';
import {
  activiteMensuelle,
  biographieDent,
  datesClesSchema,
  journalPatient,
  odontogrammeADate,
} from '@/lib/historique';
import { donneesDemo } from '@/data/seed';

function etat(numero: number, e: DentEtat['etat'], majLe: string): DentEtat {
  return { numero, etat: e, faces: [], note: '', majLe };
}

function ev(
  date: string,
  type: EvenementJournal['type'],
  dent: number | null,
  apres: unknown = null,
  patientId = 'p1',
): EvenementJournal {
  return {
    id: `${date}-${type}-${dent}`,
    date,
    auteur: 'Dr Test',
    type,
    patientId,
    dent,
    cible: dent ? `Dent ${dent}` : '—',
    resume: '',
    avant: null,
    apres,
  };
}

const journal: EvenementJournal[] = [
  ev('2026-01-10T09:00:00.000Z', 'dent.maj', 26, etat(26, 'carie', '2026-01-10T09:00:00.000Z')),
  ev('2026-02-15T09:00:00.000Z', 'dent.maj', 26, etat(26, 'obturation', '2026-02-15T09:00:00.000Z')),
  ev('2026-03-01T09:00:00.000Z', 'dent.maj', 16, etat(16, 'couronne', '2026-03-01T09:00:00.000Z')),
  ev('2026-04-01T09:00:00.000Z', 'dent.reset', 16),
  ev('2026-04-05T09:00:00.000Z', 'acte.cree', null),
  ev('2026-05-01T09:00:00.000Z', 'dent.maj', 36, etat(36, 'absente', '2026-05-01T09:00:00.000Z'), 'p2'),
];

describe('remontée temporelle du schéma', () => {
  it('rend une bouche vide avant tout événement', () => {
    expect(odontogrammeADate(journal, 'p1', '2026-01-01T00:00:00.000Z')).toEqual({});
  });

  it('restitue l’état tel qu’il était à une date donnée', () => {
    const janvier = odontogrammeADate(journal, 'p1', '2026-01-20T00:00:00.000Z');
    expect(janvier[26].etat).toBe('carie');

    const mars = odontogrammeADate(journal, 'p1', '2026-03-10T00:00:00.000Z');
    expect(mars[26].etat).toBe('obturation');
    expect(mars[16].etat).toBe('couronne');
  });

  it('prend en compte les remises à zéro', () => {
    const apres = odontogrammeADate(journal, 'p1', '2026-04-02T00:00:00.000Z');
    expect(apres[16]).toBeUndefined();
    expect(apres[26].etat).toBe('obturation');
  });

  it('ne mélange pas les patients', () => {
    const p1 = odontogrammeADate(journal, 'p1', '2026-12-31T00:00:00.000Z');
    expect(p1[36]).toBeUndefined();
    expect(odontogrammeADate(journal, 'p2', '2026-12-31T00:00:00.000Z')[36].etat).toBe('absente');
  });

  it('tolère un journal désordonné', () => {
    const melange = [...journal].reverse();
    expect(odontogrammeADate(melange, 'p1', '2026-03-10T00:00:00.000Z')[26].etat).toBe('obturation');
  });

  it('liste les dates où le schéma a changé', () => {
    const dates = datesClesSchema(journal, 'p1');
    expect(dates).toHaveLength(4);
    expect(dates[0] < dates[dates.length - 1]).toBe(true);
    // L'événement « acte.cree » ne modifie pas le schéma.
    expect(dates).not.toContain('2026-04-05T09:00:00.000Z');
  });
});

describe('biographie d’une dent', () => {
  it('retrace la vie d’une dent, du plus récent au plus ancien', () => {
    const bio = biographieDent(journal, 'p1', 26);
    expect(bio).toHaveLength(2);
    expect(bio[0].date).toBe('2026-02-15T09:00:00.000Z');
  });

  it('ne retient que la dent demandée', () => {
    expect(biographieDent(journal, 'p1', 16)).toHaveLength(2);
    expect(biographieDent(journal, 'p1', 47)).toHaveLength(0);
  });

  it('restitue le journal complet d’un patient', () => {
    expect(journalPatient(journal, 'p1')).toHaveLength(5);
    expect(journalPatient(journal, 'p2')).toHaveLength(1);
  });

  it('résume l’activité par mois', () => {
    const a = activiteMensuelle(journal, 'p1');
    expect(a).toEqual([
      { mois: '2026-01', nombre: 1 },
      { mois: '2026-02', nombre: 1 },
      { mois: '2026-03', nombre: 1 },
      { mois: '2026-04', nombre: 2 },
    ]);
  });
});

describe('journal du jeu de démonstration', () => {
  it('permet de remonter le temps sur un patient réel', () => {
    const d = donneesDemo();
    const patient = d.patients[0];
    const dates = datesClesSchema(d.journal, patient.id);
    expect(dates.length).toBeGreaterThan(0);

    const avant = odontogrammeADate(d.journal, patient.id, dates[0]);
    const maintenant = odontogrammeADate(d.journal, patient.id, new Date().toISOString());
    expect(Object.keys(avant).length).toBeLessThan(Object.keys(maintenant).length);
  });

  it('reconstitue exactement le schéma courant à la date du jour', () => {
    const d = donneesDemo();
    for (const o of d.odontogrammes) {
      const rejoue = odontogrammeADate(d.journal, o.patientId, new Date().toISOString());
      expect(Object.keys(rejoue).map(Number).sort((a, b) => a - b)).toEqual(
        o.dents.map((x) => x.numero).sort((a, b) => a - b),
      );
    }
  });
});
