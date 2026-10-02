import type { PointMensuel } from '@/lib/pilotage';
import { formatMontant } from '@/lib/utils';

/**
 * Facturé et encaissé par mois. Deux séries : couleurs validées pour la
 * vision des couleurs (bleu / ambre), légende présente et valeurs au survol.
 */
const COULEURS = { facture: '#1d66f0', encaisse: '#d97706' };

export function GrapheProduction({ points, devise }: { points: PointMensuel[]; devise: string }) {
  const max = Math.max(1, ...points.flatMap((p) => [p.facture, p.encaisse]));
  const L = 640;
  const H = 200;
  const basY = H - 24;
  const pas = points.length > 0 ? L / points.length : L;
  const largeur = Math.max(6, pas / 2 - 6);

  const graduations = [0, max / 2, max];

  return (
    <figure className="m-0">
      <figcaption className="mb-2 flex flex-wrap items-center gap-4 text-xs">
        {(
          [
            ['Facturé', COULEURS.facture],
            ['Encaissé', COULEURS.encaisse],
          ] as Array<[string, string]>
        ).map(([label, couleur]) => (
          <span key={label} className="flex items-center gap-1.5 text-slate-600">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: couleur }} />
            {label}
          </span>
        ))}
      </figcaption>

      <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img" aria-label="Facturé et encaissé par mois">
        {graduations.map((g) => {
          const y = basY - (g / max) * (basY - 14);
          return (
            <g key={g}>
              <line x1={42} x2={L} y1={y} y2={y} stroke="#e2e8f0" strokeWidth={1} />
              <text x={38} y={y + 3} textAnchor="end" className="fill-slate-400 text-[9px]">
                {Math.round(g)}
              </text>
            </g>
          );
        })}

        {points.map((p, i) => {
          const x0 = 46 + i * ((L - 50) / points.length);
          const hf = (p.facture / max) * (basY - 14);
          const he = (p.encaisse / max) * (basY - 14);
          return (
            <g key={p.cle}>
              <rect x={x0} y={basY - hf} width={largeur} height={Math.max(hf, p.facture > 0 ? 2 : 0)} rx={4} fill={COULEURS.facture}>
                <title>{`${p.label} — facturé ${formatMontant(p.facture, devise)}`}</title>
              </rect>
              <rect
                x={x0 + largeur + 2}
                y={basY - he}
                width={largeur}
                height={Math.max(he, p.encaisse > 0 ? 2 : 0)}
                rx={4}
                fill={COULEURS.encaisse}
              >
                <title>{`${p.label} — encaissé ${formatMontant(p.encaisse, devise)}`}</title>
              </rect>
              <text x={x0 + largeur + 1} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[9px]">
                {p.label}
              </text>
            </g>
          );
        })}
        <line x1={42} x2={L} y1={basY} y2={basY} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
    </figure>
  );
}
