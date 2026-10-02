import { useId, useMemo } from 'react';
import type { DentEtat, Dentition, EtatDent, Face } from '@/types';
import { ETATS, estDroite, facesDisponibles, nomDent } from '@/data/teeth';
import { contourCouronne, disposerArcades, sillons, type PlacementDent } from '@/data/anatomie';
import { cx } from '@/lib/utils';

const ZONES = ['haut', 'droite', 'bas', 'gauche', 'centre'] as const;
type Zone = (typeof ZONES)[number];

/**
 * Correspondance zone → face dans le repère local de la dent.
 * Le repère est normalisé à la pose : −Y pointe toujours vers le vestibule,
 * +X vers le distal à gauche du patient et vers le mésial à droite.
 */
export function faceLocale(numero: number, zone: Zone): Face {
  switch (zone) {
    case 'haut':
      return 'V';
    case 'bas':
      return 'L';
    case 'droite':
      return estDroite(numero) ? 'M' : 'D';
    case 'gauche':
      return estDroite(numero) ? 'D' : 'M';
    default:
      return 'O';
  }
}

function polygoneZone(zone: Zone, w: number, h: number): string {
  const ix = w * 0.42;
  const iy = h * 0.42;
  const pts = (...p: Array<[number, number]>) => p.map(([x, y]) => `${x.toFixed(3)},${y.toFixed(3)}`).join(' ');
  switch (zone) {
    case 'haut':
      return pts([-w, -h], [w, -h], [ix, -iy], [-ix, -iy]);
    case 'droite':
      return pts([w, -h], [w, h], [ix, iy], [ix, -iy]);
    case 'bas':
      return pts([-w, h], [-ix, iy], [ix, iy], [w, h]);
    case 'gauche':
      return pts([-w, -h], [-ix, -iy], [-ix, iy], [-w, h]);
    default:
      return pts([-ix, -iy], [ix, -iy], [ix, iy], [-ix, iy]);
  }
}

export interface OdontogrammeArcadeProps {
  dentition: Dentition;
  etats: Record<number, DentEtat>;
  selection: number[];
  onSelectionDent: (numero: number, evenement: { ctrl: boolean }) => void;
  pinceau?: EtatDent | null;
  onPeindreFace?: (numero: number, face: Face) => void;
  /** Teinte de fond par dent, pour superposer une autre lecture (parodontale…). */
  teintes?: Record<number, string>;
  className?: string;
  lectureSeule?: boolean;
  /** Hauteur CSS du schéma ; l'arcade est un dessin en portrait. */
  hauteurCss?: string;
}

/**
 * Odontogramme anatomique : chaque couronne est dessinée à ses dimensions
 * réelles, posée sur la courbe de l'arcade et orientée selon la tangente.
 * Les cinq faces restent cliquables, découpées dans la silhouette de la dent.
 */
export function OdontogrammeArcade({
  dentition,
  etats,
  selection,
  onSelectionDent,
  pinceau = null,
  onPeindreFace,
  teintes,
  className,
  lectureSeule = false,
  hauteurCss = 'clamp(360px, 56vh, 620px)',
}: OdontogrammeArcadeProps) {
  const idBase = useId().replace(/:/g, '');
  const { haut, bas, boite } = useMemo(() => disposerArcades(dentition), [dentition]);

  const rendreDent = (p: PlacementDent, maxillaire: boolean) => {
    const { numero, dimensions: dim } = p;
    const w = dim.md / 2;
    const h = dim.vl / 2;
    const etat = etats[numero];
    const meta = ETATS[etat?.etat ?? 'saine'];
    const faces = etat?.faces ?? [];
    const disponibles = facesDisponibles(numero);
    const selectionnee = selection.includes(numero);
    const toutMarque = !!etat && etat.etat !== 'saine' && faces.length === 0;
    const absente = etat?.etat === 'absente';
    const clipId = `${idBase}-c-${numero}`;
    const sy = maxillaire ? 1 : -1;
    const contour = contourCouronne(numero, dim);

    // Direction vestibulaire projetée à l'écran, pour poser le numéro à l'extérieur.
    const rad = (p.rotation * Math.PI) / 180;
    const vx = maxillaire ? Math.sin(rad) : -Math.sin(rad);
    const vy = maxillaire ? -Math.cos(rad) : Math.cos(rad);
    const distanceLabel = h + 4.2;
    const lx = p.x + vx * distanceLabel;
    const ly = p.y + vy * distanceLabel;

    return (
      <g key={numero}>
        <g transform={`translate(${p.x} ${p.y}) rotate(${p.rotation}) scale(1 ${sy})`}>
          <defs>
            <clipPath id={clipId}>
              <path d={contour} />
            </clipPath>
          </defs>

          {selectionnee ? (
            <path
              d={contour}
              transform="scale(1.22)"
              className="fill-brand-100 stroke-brand-500"
              strokeWidth={0.5}
              pointerEvents="none"
            />
          ) : null}

          <g clipPath={`url(#${clipId})`}>
            {ZONES.map((zone) => {
              const face = faceLocale(numero, zone);
              const utilisable = disponibles.includes(face);
              const active = toutMarque || faces.includes(face);
              const remplissage = utilisable && active ? meta.couleur : (teintes?.[numero] ?? '#ffffff');
              return (
                <polygon
                  key={zone}
                  points={polygoneZone(zone, w, h)}
                  fill={remplissage}
                  aria-label={utilisable ? `Dent ${numero} — face ${face}` : `Dent ${numero}`}
                  stroke={active ? meta.bordure : '#cbd5e1'}
                  strokeWidth={active ? 0.22 : 0.16}
                  className={lectureSeule ? undefined : 'cursor-pointer'}
                  onClick={
                    lectureSeule
                      ? undefined
                      : (e) => {
                          e.stopPropagation();
                          if (pinceau && utilisable && onPeindreFace) onPeindreFace(numero, face);
                          else onSelectionDent(numero, { ctrl: e.ctrlKey || e.metaKey || e.shiftKey });
                        }
                  }
                >
                  <title>{utilisable ? `Dent ${numero} — face ${face}` : `Dent ${numero}`}</title>
                </polygon>
              );
            })}
          </g>

          {sillons(numero, dim).map((d, i) => (
            <path
              key={i}
              d={d}
              fill="none"
              stroke="#94a3b8"
              strokeWidth={0.18}
              strokeLinecap="round"
              opacity={0.7}
              pointerEvents="none"
            />
          ))}

          <path
            d={contour}
            fill="none"
            stroke={etat && etat.etat !== 'saine' ? meta.bordure : '#64748b'}
            strokeWidth={selectionnee ? 0.45 : 0.25}
            pointerEvents="none"
          />

          {absente ? (
            <g pointerEvents="none" stroke="#475569" strokeWidth={0.5} strokeLinecap="round">
              <line x1={-w * 0.7} y1={-h * 0.7} x2={w * 0.7} y2={h * 0.7} />
              <line x1={w * 0.7} y1={-h * 0.7} x2={-w * 0.7} y2={h * 0.7} />
            </g>
          ) : null}
        </g>

        {etat?.note ? (
          <circle cx={p.x + vx * (h + 1.2)} cy={p.y + vy * (h + 1.2)} r={0.7} fill="#0f172a" pointerEvents="none">
            <title>{etat.note}</title>
          </circle>
        ) : null}

        <text
          x={lx}
          y={ly}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={3}
          className={cx(
            'select-none font-semibold',
            selectionnee ? 'fill-brand-700' : 'fill-slate-500',
          )}
          pointerEvents="none"
        >
          {numero}
        </text>
      </g>
    );
  };

  return (
    <div className={cx('w-full', className)}>
      <svg
        viewBox={`${boite.x} ${boite.y} ${boite.largeur} ${boite.hauteur}`}
        role="img"
        aria-label="Schéma dentaire anatomique"
        preserveAspectRatio="xMidYMid meet"
        className="mx-auto block w-full"
        style={{ height: hauteurCss, maxWidth: '100%' }}
      >
        <line
          x1={0}
          y1={boite.y + 2}
          x2={0}
          y2={boite.y + boite.hauteur - 2}
          stroke="#e2e8f0"
          strokeDasharray="1.5 1.5"
          strokeWidth={0.2}
        />
        <text x={boite.x + 1.5} y={boite.y + 4} fontSize={2.8} className="fill-slate-400">
          Maxillaire
        </text>
        <text x={boite.x + 1.5} y={boite.y + boite.hauteur - 1.5} fontSize={2.8} className="fill-slate-400">
          Mandibule
        </text>
        <text
          x={boite.x + boite.largeur - 1.5}
          y={boite.y + 4}
          fontSize={2.8}
          textAnchor="end"
          className="fill-slate-300"
        >
          droite ← patient → gauche
        </text>

        {haut.map((p) => rendreDent(p, true))}
        {bas.map((p) => rendreDent(p, false))}
      </svg>
    </div>
  );
}

export { nomDent };
