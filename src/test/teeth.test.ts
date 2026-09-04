import { describe, expect, it } from 'vitest';
import {
  ARCADE_INF_PERM,
  ARCADE_SUP_PERM,
  arcades,
  estDentTemporaire,
  estDroite,
  estMaxillaire,
  facesDisponibles,
  nomDent,
  position,
  quadrant,
  toutesLesDents,
  typeDent,
} from '@/data/teeth';
import { faceParZone } from '@/components/DentalChart';

describe('numérotation FDI', () => {
  it('couvre 32 dents permanentes et 20 dents temporaires', () => {
    expect(toutesLesDents('permanente')).toHaveLength(32);
    expect(toutesLesDents('temporaire')).toHaveLength(20);
  });

  it('ordonne les arcades de la droite du patient vers sa gauche', () => {
    expect(ARCADE_SUP_PERM[0]).toBe(18);
    expect(ARCADE_SUP_PERM[15]).toBe(28);
    expect(ARCADE_INF_PERM[0]).toBe(48);
    expect(ARCADE_INF_PERM[15]).toBe(38);
  });

  it('n’a aucun doublon', () => {
    const dents = toutesLesDents('permanente');
    expect(new Set(dents).size).toBe(dents.length);
  });

  it('identifie quadrant, position et latéralité', () => {
    expect(quadrant(26)).toBe(2);
    expect(position(26)).toBe(6);
    expect(estMaxillaire(26)).toBe(true);
    expect(estMaxillaire(46)).toBe(false);
    expect(estDroite(18)).toBe(true);
    expect(estDroite(28)).toBe(false);
  });

  it('reconnaît la dentition temporaire', () => {
    expect(estDentTemporaire(54)).toBe(true);
    expect(estDentTemporaire(14)).toBe(false);
    expect(arcades('temporaire').haut).toContain(51);
  });

  it('classe les types de dents', () => {
    expect(typeDent(11)).toBe('incisive');
    expect(typeDent(13)).toBe('canine');
    expect(typeDent(15)).toBe('premolaire');
    expect(typeDent(17)).toBe('molaire');
    expect(typeDent(54)).toBe('molaire');
  });

  it('n’expose pas de face occlusale sur les dents antérieures', () => {
    expect(facesDisponibles(11)).not.toContain('O');
    expect(facesDisponibles(16)).toContain('O');
    expect(facesDisponibles(16)).toHaveLength(5);
  });

  it('nomme les dents en français', () => {
    expect(nomDent(11)).toBe('Incisive centrale maxillaire droite');
    expect(nomDent(38)).toContain('sagesse');
  });
});

describe('orientation anatomique des faces', () => {
  it('place le vestibulaire vers l’extérieur de chaque arcade', () => {
    expect(faceParZone(16, 'haut')).toBe('V');
    expect(faceParZone(16, 'bas')).toBe('L');
    expect(faceParZone(46, 'haut')).toBe('L');
    expect(faceParZone(46, 'bas')).toBe('V');
  });

  it('place le mésial du côté de la ligne médiane', () => {
    expect(faceParZone(16, 'droite')).toBe('M');
    expect(faceParZone(26, 'gauche')).toBe('M');
    expect(faceParZone(16, 'gauche')).toBe('D');
    expect(faceParZone(26, 'droite')).toBe('D');
  });

  it('réserve le centre à la face occlusale', () => {
    expect(faceParZone(16, 'centre')).toBe('O');
  });
});
