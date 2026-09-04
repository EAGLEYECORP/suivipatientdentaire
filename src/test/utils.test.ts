import { describe, expect, it } from 'vitest';
import { age, ajouterMinutes, arrondi2, correspond, debutSemaine, initiales, memeJour, normaliser } from '@/lib/utils';

describe('utilitaires', () => {
  it('calcule l’âge en années révolues', () => {
    expect(age('1990-06-15', new Date('2026-06-14T12:00:00'))).toBe(35);
    expect(age('1990-06-15', new Date('2026-06-15T12:00:00'))).toBe(36);
  });

  it('recherche sans tenir compte des accents ni de la casse', () => {
    expect(normaliser('Amélie')).toBe('amelie');
    expect(correspond('Amélie Petit', 'amelie')).toBe(true);
    expect(correspond('Amélie Petit', 'PETIT')).toBe(true);
    expect(correspond('Amélie Petit', 'durand')).toBe(false);
    expect(correspond('Amélie Petit', '')).toBe(true);
  });

  it('produit les initiales', () => {
    expect(initiales('Marie', 'Durand')).toBe('MD');
  });

  it('ramène la semaine au lundi', () => {
    const dimanche = new Date('2026-03-08T15:00:00');
    expect(debutSemaine(dimanche).getDay()).toBe(1);
    expect(debutSemaine(dimanche).getDate()).toBe(2);
  });

  it('compare les jours et décale les horaires', () => {
    expect(memeJour('2026-03-02T08:00:00', '2026-03-02T20:00:00')).toBe(true);
    expect(memeJour('2026-03-02T08:00:00', '2026-03-03T08:00:00')).toBe(false);
    expect(ajouterMinutes('2026-03-02T08:00:00.000Z', 45)).toBe('2026-03-02T08:45:00.000Z');
  });

  it('arrondit au centime', () => {
    expect(arrondi2(0.1 + 0.2)).toBe(0.3);
    expect(arrondi2(515.9599999)).toBe(515.96);
  });
});
