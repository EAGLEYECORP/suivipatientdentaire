import { describe, expect, it } from 'vitest';
import type { CycleSterilisation, UtilisationCycle } from '@/types';
import {
  LIBELLE_STERILISATEUR,
  TYPES_STERILISATEUR,
  bilan,
  cycleUtilisable,
  cyclesDuPatient,
  ecartAuxReperes,
  motifNonConformite,
  numeroDejaPris,
  rappelsAvecPatients,
  rappelsNecessaires,
  statutCycle,
} from '@/data/sterilisation';

const cycle = (p: Partial<CycleSterilisation> = {}): CycleSterilisation => ({
  id: 'c1',
  numero: '100',
  date: '2026-10-20T08:00:00.000Z',
  sterilisateur: 'Autoclave 1',
  type: 'autoclave_b',
  temperature: 134,
  dureePalier: 18,
  charge: 'Plateaux',
  indicateurPhysique: true,
  indicateurChimique: true,
  indicateurBiologique: null,
  operateur: 'Dr Fontaine',
  note: '',
  invalideLe: null,
  motifInvalidation: '',
  ...p,
});

const emploi = (p: Partial<UtilisationCycle> = {}): UtilisationCycle => ({
  id: 'u1',
  cycleId: 'c1',
  patientId: 'pat_1',
  date: '2026-10-20T09:00:00.000Z',
  acte: 'Composite',
  ...p,
});

describe('statut d’un cycle', () => {
  it('conforme quand les indicateurs requis passent', () => {
    expect(statutCycle(cycle())).toBe('conforme');
    expect(cycleUtilisable(cycle())).toBe(true);
  });

  it('non conforme sans enregistrement ou sans intégrateur', () => {
    expect(statutCycle(cycle({ indicateurPhysique: false }))).toBe('non_conforme');
    expect(statutCycle(cycle({ indicateurChimique: false }))).toBe('non_conforme');
  });

  /*
   * Le test de spores n'est pas fait à chaque cycle : son absence est
   * normale et ne doit pas bloquer. Seul un résultat positif condamne.
   */
  it('distingue un test biologique non réalisé d’un test positif', () => {
    expect(statutCycle(cycle({ indicateurBiologique: null }))).toBe('conforme');
    expect(statutCycle(cycle({ indicateurBiologique: true }))).toBe('conforme');
    expect(statutCycle(cycle({ indicateurBiologique: false }))).toBe('non_conforme');
  });

  /*
   * Le cas que ce module existe pour traiter : un cycle déclaré conforme le
   * lundi, invalidé le mercredi quand le test de spores revient.
   */
  it('l’invalidation rétrospective prime sur des indicateurs au vert', () => {
    const c = cycle({ invalideLe: '2026-10-22T09:00:00.000Z', motifInvalidation: 'Spores positif.' });
    expect(statutCycle(c)).toBe('invalide');
    expect(cycleUtilisable(c)).toBe(false);
  });
});

describe('motif de non-conformité', () => {
  it('ne dit rien d’un cycle conforme', () => {
    expect(motifNonConformite(cycle())).toBe('');
  });

  it('énumère ce qui manque', () => {
    const m = motifNonConformite(cycle({ indicateurPhysique: false, indicateurChimique: false }));
    expect(m).toContain('enregistrement du cycle');
    expect(m).toContain('intégrateur chimique');
  });

  it('reprend le motif saisi à l’invalidation', () => {
    expect(motifNonConformite(cycle({ invalideLe: 'x', motifInvalidation: 'Spores positif.' }))).toBe(
      'Spores positif.',
    );
  });

  it('reste explicite si l’invalidation n’a pas de motif', () => {
    expect(motifNonConformite(cycle({ invalideLe: 'x', motifInvalidation: '' })).length).toBeGreaterThan(10);
  });
});

describe('unicité du numéro de cycle', () => {
  it('repère un numéro déjà porté sur des sachets', () => {
    const cycles = [cycle({ id: 'a', numero: '148' })];
    expect(numeroDejaPris(cycles, '148')).toBe(true);
    expect(numeroDejaPris(cycles, ' 148 ')).toBe(true);
    expect(numeroDejaPris(cycles, '149')).toBe(false);
  });

  it('ne se signale pas lui-même en modification', () => {
    const cycles = [cycle({ id: 'a', numero: '148' })];
    expect(numeroDejaPris(cycles, '148', 'a')).toBe(false);
  });

  it('ignore un numéro vide', () => {
    expect(numeroDejaPris([cycle({ numero: '' })], '')).toBe(false);
  });
});

describe('remontée vers les patients', () => {
  const cycles = [
    cycle({ id: 'bon', numero: '147' }),
    cycle({ id: 'mauvais', numero: '148', indicateurBiologique: false }),
    cycle({ id: 'inutilise', numero: '149', indicateurPhysique: false }),
  ];
  const emplois = [
    emploi({ id: 'u1', cycleId: 'bon', patientId: 'pat_1' }),
    emploi({ id: 'u2', cycleId: 'mauvais', patientId: 'pat_2' }),
    emploi({ id: 'u3', cycleId: 'mauvais', patientId: 'pat_7' }),
    emploi({ id: 'u4', cycleId: 'mauvais', patientId: 'pat_2', acte: 'Second acte' }),
  ];

  it('ne retient que les cycles non conformes', () => {
    const r = rappelsNecessaires(cycles, emplois);
    expect(r.map((x) => x.cycle.id).sort()).toEqual(['inutilise', 'mauvais']);
  });

  it('nomme chaque patient exposé une seule fois', () => {
    const r = rappelsNecessaires(cycles, emplois).find((x) => x.cycle.id === 'mauvais')!;
    expect(r.patientIds.sort()).toEqual(['pat_2', 'pat_7']);
    /* Les emplois restent tous listés : deux actes, deux lignes. */
    expect(r.utilisations).toHaveLength(3);
  });

  /*
   * Un cycle raté dont rien n'est sorti demande de relancer un cycle, pas de
   * rappeler des patients. Les deux situations ne se traitent pas pareil.
   */
  it('sépare les cycles ratés sans emploi de ceux qui imposent un rappel', () => {
    const avec = rappelsAvecPatients(cycles, emplois);
    expect(avec.map((x) => x.cycle.id)).toEqual(['mauvais']);
  });

  it('ne rappelle personne quand tout est conforme', () => {
    expect(rappelsAvecPatients([cycle()], emplois)).toEqual([]);
  });

  it('retrouve les cycles reçus par un patient donné', () => {
    expect(cyclesDuPatient('pat_2', cycles, emplois).map((c) => c.numero)).toEqual(['148']);
    expect(cyclesDuPatient('inconnu', cycles, emplois)).toEqual([]);
  });
});

describe('bilan', () => {
  it('compte les patients à rappeler sans doublon', () => {
    const cycles = [cycle({ id: 'a' }), cycle({ id: 'b', indicateurBiologique: false })];
    const emplois = [
      emploi({ id: 'u1', cycleId: 'b', patientId: 'pat_2' }),
      emploi({ id: 'u2', cycleId: 'b', patientId: 'pat_2' }),
      emploi({ id: 'u3', cycleId: 'b', patientId: 'pat_9' }),
    ];
    expect(bilan(cycles, emplois)).toEqual({
      total: 2,
      conformes: 1,
      aTraiter: 1,
      patientsARappeler: 2,
      tauxConformite: 50,
    });
  });

  it('ne divise pas par zéro sur un registre vide', () => {
    expect(bilan([], []).tauxConformite).toBeNull();
  });
});

describe('repères de procédé', () => {
  it('ne signale rien sur un cycle aux paramètres attendus', () => {
    expect(ecartAuxReperes(cycle())).toBe('');
  });

  /* Un écart est signalé pour relecture, jamais refusé : c'est le praticien
     qui connaît son appareil. */
  it('signale une température ou un palier insuffisants', () => {
    expect(ecartAuxReperes(cycle({ temperature: 121 }))).toContain('température');
    expect(ecartAuxReperes(cycle({ dureePalier: 4 }))).toContain('palier');
  });

  it('traduit chaque procédé proposé', () => {
    for (const t of TYPES_STERILISATEUR) expect(LIBELLE_STERILISATEUR[t]).toBeTruthy();
  });
});
