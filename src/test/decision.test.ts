import { describe, expect, it } from 'vitest';
import type { Acte, ChartingParo, DentEtat, Patient } from '@/types';
import {
  evaluerAlertes,
  evaluerRisqueCarieux,
  evaluerRisqueParodontal,
  intervalleRappelConseille,
} from '@/lib/decision';
import { dentPerioVide } from '@/data/perio';
import { facteursRisqueVides } from '@/data/seed';

function patient(p: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    nom: 'Test',
    prenom: 'Patient',
    dateNaissance: '1976-01-01',
    sexe: 'F',
    telephone: '',
    email: '',
    adresse: '',
    numeroSecu: '',
    mutuelle: '',
    medecinTraitant: '',
    allergies: [],
    antecedents: [],
    traitementsEnCours: [],
    alertes: [],
    facteursRisque: facteursRisqueVides(),
    rappelMois: 6,
    dernierControle: null,
    notes: '',
    creeLe: '2020-01-01T00:00:00.000Z',
    majLe: '2020-01-01T00:00:00.000Z',
    actif: true,
    ...p,
  };
}

function acte(codeActe: string, dents: number[] = [], statut: Acte['statut'] = 'planifie'): Acte {
  return {
    id: `a-${codeActe}-${dents.join('')}`,
    patientId: 'p1',
    dents,
    faces: [],
    codeActe,
    libelle: codeActe,
    statut,
    tarif: 100,
    baseRemboursement: 30,
    seance: 1,
    praticien: 'Dr Test',
    datePrevue: '2026-05-01',
    dateRealisation: null,
    rdvId: null,
    notes: '',
    creeLe: '2026-01-01T00:00:00.000Z',
  };
}

function dent(numero: number, etat: DentEtat['etat']): DentEtat {
  return { numero, etat, faces: [], note: '', majLe: '2026-01-01T00:00:00.000Z' };
}

const regles = (a: ReturnType<typeof evaluerAlertes>) => a.map((x) => x.regle);

describe('alertes de sécurité', () => {
  it('signale le risque hémorragique avant un geste sanglant', () => {
    const a = evaluerAlertes({
      patient: patient({ traitementsEnCours: ['Kardegic 75 mg'] }),
      actes: [acte('HBGD036', [46])],
      dents: [],
    });
    expect(regles(a)).toContain('hemostase.anticoagulant');
    expect(a[0].severite).toBe('critique');
    expect(a[0].declencheur).toContain('Kardegic');
  });

  it('ne déclenche pas l’alerte hémorragique sans geste sanglant', () => {
    const a = evaluerAlertes({
      patient: patient({ traitementsEnCours: ['Kardegic 75 mg'] }),
      actes: [acte('HBMD038', [26])],
      dents: [],
    });
    expect(regles(a)).not.toContain('hemostase.anticoagulant');
  });

  it('ignore un acte sanglant déjà réalisé', () => {
    const a = evaluerAlertes({
      patient: patient({ traitementsEnCours: ['Previscan'] }),
      actes: [acte('HBGD036', [46], 'realise')],
      dents: [],
    });
    expect(regles(a)).not.toContain('hemostase.anticoagulant');
  });

  it('signale le risque d’ostéonécrose sous antirésorptif', () => {
    const a = evaluerAlertes({
      patient: patient({ antecedents: ['Prise de bisphosphonates'] }),
      actes: [acte('LBLD010', [46])],
      dents: [],
    });
    expect(regles(a)).toContain('mronj.antiresorptif');
  });

  it('reconnaît le dénosumab comme antirésorptif', () => {
    const a = evaluerAlertes({
      patient: patient({ traitementsEnCours: ['Prolia (denosumab)'] }),
      actes: [acte('HBGD036', [38])],
      dents: [],
    });
    expect(regles(a)).toContain('mronj.antiresorptif');
  });

  it('repère les allergies malgré accents et casse', () => {
    const a = evaluerAlertes({
      patient: patient({ allergies: ['Anesthésiques locaux (ARTICAÏNE)'] }),
      actes: [acte('HBMD038', [26])],
      dents: [],
    });
    expect(regles(a)).toContain('allergie.anesthesique');
  });

  it('exige une antibioprophylaxie chez le patient à risque d’endocardite', () => {
    const a = evaluerAlertes({
      patient: patient({ antecedents: ['Prothèse valvulaire mécanique'] }),
      actes: [acte('HBJD001')],
      dents: [],
    });
    expect(regles(a)).toContain('endocardite.prophylaxie');
  });

  it('classe les alertes de la plus grave à la moins grave', () => {
    const a = evaluerAlertes({
      patient: patient({
        allergies: ['Latex'],
        traitementsEnCours: ['Xarelto'],
      }),
      actes: [acte('HBGD036', [46])],
      dents: [],
    });
    expect(a[0].severite).toBe('critique');
    expect(a[a.length - 1].severite).not.toBe('critique');
  });
});

describe('alertes cliniques', () => {
  it('signale une carie sans acte programmé', () => {
    const a = evaluerAlertes({
      patient: patient(),
      actes: [],
      dents: [dent(26, 'carie'), dent(16, 'obturation')],
    });
    const alerte = a.find((x) => x.regle === 'lesion.carie_sans_acte');
    expect(alerte).toBeDefined();
    expect(alerte!.dents).toEqual([26]);
  });

  it('se tait quand la carie est déjà au plan de traitement', () => {
    const a = evaluerAlertes({
      patient: patient(),
      actes: [acte('HBMD038', [26])],
      dents: [dent(26, 'carie')],
    });
    expect(regles(a)).not.toContain('lesion.carie_sans_acte');
  });

  it('alerte sur une dent postérieure dépulpée sans coiffe prévue', () => {
    const a = evaluerAlertes({ patient: patient(), actes: [], dents: [dent(46, 'endodontie')] });
    expect(regles(a)).toContain('endodontie.sans_coiffe');
  });

  it('ne le fait pas pour une incisive, ni si la couronne est prévue', () => {
    expect(regles(evaluerAlertes({ patient: patient(), actes: [], dents: [dent(11, 'endodontie')] }))).not.toContain(
      'endodontie.sans_coiffe',
    );
    expect(
      regles(
        evaluerAlertes({
          patient: patient(),
          actes: [acte('HBLD017', [46])],
          dents: [dent(46, 'endodontie')],
        }),
      ),
    ).not.toContain('endodontie.sans_coiffe');
  });

  it('signale un rappel dépassé', () => {
    const a = evaluerAlertes({
      patient: patient({ dernierControle: '2025-01-01', rappelMois: 6 }),
      actes: [],
      dents: [],
      aujourdHui: new Date('2026-03-01T12:00:00'),
    });
    const alerte = a.find((x) => x.regle === 'rappel.depasse');
    expect(alerte).toBeDefined();
    expect(alerte!.declencheur).toMatch(/mois de retard/);
  });

  it('ne signale rien quand le rappel n’est pas échu', () => {
    const a = evaluerAlertes({
      patient: patient({ dernierControle: '2026-01-01', rappelMois: 6 }),
      actes: [],
      dents: [],
      aujourdHui: new Date('2026-03-01T12:00:00'),
    });
    expect(regles(a)).not.toContain('rappel.depasse');
  });

  it('ne produit aucune alerte sur un dossier sain', () => {
    expect(evaluerAlertes({ patient: patient(), actes: [], dents: [] })).toEqual([]);
  });
});

describe('risque carieux', () => {
  it('classe faible un patient sans lésion ni facteur', () => {
    const e = evaluerRisqueCarieux(patient(), []);
    expect(e.niveau).toBe('faible');
    expect(e.intervalleRappelMois).toBe(12);
  });

  it('classe élevé dès qu’une lésion active est présente', () => {
    const e = evaluerRisqueCarieux(patient(), [dent(26, 'carie')]);
    expect(e.niveau).toBe('eleve');
    expect(e.indicateurs.join(' ')).toContain('26');
    expect(e.intervalleRappelMois).toBe(4);
  });

  it('classe extrême si une lésion active s’ajoute à une hyposialie', () => {
    const p = patient({ facteursRisque: { ...facteursRisqueVides(), boucheSeche: true } });
    const e = evaluerRisqueCarieux(p, [dent(26, 'carie')]);
    expect(e.niveau).toBe('extreme');
    expect(e.intervalleRappelMois).toBe(3);
    expect(e.recommandations.join(' ')).toMatch(/salivaire/i);
  });

  it('classe élevé un cumul de facteurs sans lésion', () => {
    const p = patient({
      facteursRisque: {
        ...facteursRisqueVides(),
        grignotageSucre: true,
        hygieneInsuffisante: true,
        appareillage: true,
      },
    });
    expect(evaluerRisqueCarieux(p, []).niveau).toBe('eleve');
  });

  it('tient compte des éléments protecteurs', () => {
    const e = evaluerRisqueCarieux(patient(), []);
    expect(e.protecteurs.join(' ')).toMatch(/fluor/i);
  });
});

describe('risque parodontal', () => {
  function charting(pd: number, bop: boolean): ChartingParo {
    const dents = [16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26].map((n) => {
      const d = dentPerioVide(n);
      for (const s of Object.keys(d.sites) as Array<keyof typeof d.sites>) {
        d.sites[s] = { pd, rec: 0, bop, plaque: false, pus: false };
      }
      return d;
    });
    return {
      id: 'c',
      patientId: 'p1',
      date: '2026-03-01T00:00:00.000Z',
      praticien: 'Dr Test',
      dents,
      perteOsseusePct: null,
      fumeur: 'non',
      diabete: 'non',
      notes: '',
    };
  }

  it('classe faible un parodonte assaini chez un patient sans facteur', () => {
    const r = evaluerRisqueParodontal(patient(), charting(2, false), []);
    expect(r.niveau).toBe('faible');
    expect(r.intervalleRappelMois).toBe(12);
  });

  it('classe élevé le cumul saignement, poches et tabac', () => {
    const p = patient({ facteursRisque: { ...facteursRisqueVides(), tabac: 'dix_ou_plus' } });
    const r = evaluerRisqueParodontal(p, charting(6, true), []);
    expect(r.niveau).toBe('eleve');
    expect(r.intervalleRappelMois).toBe(3);
  });

  it('fonctionne sans sondage, sur les seuls facteurs généraux', () => {
    const p = patient({ facteursRisque: { ...facteursRisqueVides(), tabac: 'dix_ou_plus' } });
    const r = evaluerRisqueParodontal(p, undefined, []);
    expect(r.commentaire).toMatch(/aucun sondage/i);
    expect(r.vecteurs.length).toBeGreaterThan(0);
  });

  it('compte les dents absentes comme un vecteur de risque', () => {
    const absentes = [16, 17, 18, 26, 27, 28, 36, 37, 38].map((n) => dent(n, 'absente'));
    const r = evaluerRisqueParodontal(patient(), undefined, absentes);
    const vecteur = r.vecteurs.find((v) => v.nom === 'Dents absentes')!;
    expect(vecteur.niveau).toBe('eleve');
  });
});

describe('intervalle de rappel', () => {
  it('retient toujours le profil le plus contraignant', () => {
    const carie = evaluerRisqueCarieux(patient(), []);
    const p = patient({ facteursRisque: { ...facteursRisqueVides(), tabac: 'dix_ou_plus', diabete: 'desequilibre' } });
    const paro = evaluerRisqueParodontal(p, undefined, []);
    const r = intervalleRappelConseille(carie, paro);
    expect(r.mois).toBe(3);
    expect(r.motif).toMatch(/parodontal/);
  });

  it('peut être dicté par le risque carieux', () => {
    const carie = evaluerRisqueCarieux(patient(), [dent(26, 'carie')]);
    const paro = evaluerRisqueParodontal(patient(), undefined, []);
    expect(intervalleRappelConseille(carie, paro).motif).toMatch(/carieux/);
  });
});
