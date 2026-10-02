import { describe, expect, it } from 'vitest';
import {
  chiffrementDisponible,
  creerCoffre,
  desceller,
  estEnveloppeChiffree,
  forcePhrase,
  ouvrirCoffre,
  sceller,
} from '@/lib/crypto';

describe('coffre chiffré', () => {
  it('expose le sous-système de chiffrement', () => {
    expect(chiffrementDisponible()).toBe(true);
  });

  it('scelle puis descelle avec la bonne phrase', async () => {
    const coffre = await creerCoffre('phrase du cabinet 2026 !');
    const enveloppe = await sceller(JSON.stringify({ patients: ['Durand'] }), coffre);

    expect(estEnveloppeChiffree(enveloppe)).toBe(true);
    expect(JSON.stringify(enveloppe)).not.toContain('Durand');

    const rouvert = await ouvrirCoffre('phrase du cabinet 2026 !', enveloppe.sel);
    expect(JSON.parse(await desceller(enveloppe, rouvert))).toEqual({ patients: ['Durand'] });
  });

  it('refuse une phrase incorrecte', async () => {
    const coffre = await creerCoffre('bonne phrase');
    const enveloppe = await sceller('secret', coffre);
    const faux = await ouvrirCoffre('mauvaise phrase', enveloppe.sel);
    await expect(desceller(enveloppe, faux)).rejects.toThrow(/incorrecte/i);
  });

  it('utilise un sel et un IV différents à chaque scellement', async () => {
    const a = await creerCoffre('phrase');
    const b = await creerCoffre('phrase');
    expect(a.sel).not.toEqual(b.sel);
    const e1 = await sceller('même contenu', a);
    const e2 = await sceller('même contenu', a);
    expect(e1.iv).not.toBe(e2.iv);
    expect(e1.charge).not.toBe(e2.charge);
  });

  it('note la robustesse de la phrase', () => {
    expect(forcePhrase('abc').score).toBe(0);
    expect(forcePhrase('Cabinet2026!dentaire').score).toBe(4);
    expect(forcePhrase('Cabinet2026!dentaire').libelle).toBe('Excellente');
  });

  it('ne reconnaît pas un contenu en clair comme une enveloppe', () => {
    expect(estEnveloppeChiffree({ patients: [] })).toBe(false);
    expect(estEnveloppeChiffree(null)).toBe(false);
  });
});
