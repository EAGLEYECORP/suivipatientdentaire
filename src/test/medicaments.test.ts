import { describe, expect, it } from 'vitest';
import { MODELES_ORDONNANCE, contreIndication } from '@/data/medicaments';

const modele = (id: string) => MODELES_ORDONNANCE.find((m) => m.id === id)!;

describe('contre-indications des modèles d’ordonnance', () => {
  it('bloque l’amoxicilline chez un patient allergique à la pénicilline', () => {
    expect(contreIndication(modele('infection'), ['Pénicilline'])).toBe('Pénicilline');
    expect(contreIndication(modele('prophylaxie'), ['Pénicilline'])).toBe('Pénicilline');
  });

  it('laisse passer l’alternative adaptée', () => {
    expect(contreIndication(modele('infection-allergie'), ['Pénicilline'])).toBeNull();
  });

  it('ignore accents, casse et libellés approximatifs', () => {
    expect(contreIndication(modele('infection'), ['allergie amoxicilline'])).toBeTruthy();
    expect(contreIndication(modele('infection'), ['BÊTA-LACTAMINE'])).toBeTruthy();
  });

  it('bloque les AINS chez un patient sous anticoagulant', () => {
    expect(contreIndication(modele('douleur-inflammation'), ['anticoagulant'])).toBeTruthy();
  });

  it('ne bloque rien sans allergie déclarée', () => {
    for (const m of MODELES_ORDONNANCE) expect(contreIndication(m, [])).toBeNull();
    expect(contreIndication(modele('infection'), ['Latex'])).toBeNull();
  });

  it('propose des modèles complets et utilisables', () => {
    for (const m of MODELES_ORDONNANCE) {
      expect(m.lignes.length).toBeGreaterThan(0);
      for (const l of m.lignes) {
        expect(l.medicament).not.toBe('');
        expect(l.posologie).not.toBe('');
      }
    }
  });
});
