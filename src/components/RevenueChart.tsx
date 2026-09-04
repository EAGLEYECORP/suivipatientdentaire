import { useMemo } from 'react';
import { formatMontant } from '@/lib/utils';

export interface PointMois {
  label: string;
  valeur: number;
}

/**
 * Single-series monthly revenue bars: one hue, recessive axis, values on hover.
 * One series means no legend is needed — the card title names it.
 */
export function RevenueChart({ points, devise }: { points: PointMois[]; devise: string }) {
  const max = useMemo(() => Math.max(1, ...points.map((p) => p.valeur)), [points]);
  const L = 320;
  const H = 132;
  const basY = H - 20;
  const largeurBarre = Math.max(8, L / points.length - 12);
  const pas = points.length > 0 ? L / points.length : L;

  return (
    <figure className="m-0">
      <svg viewBox={`0 0 ${L} ${H}`} width="100%" role="img" aria-label="Chiffre d’affaires encaissé par mois">
        {[0, 0.5, 1].map((t) => (
          <line
            key={t}
            x1={0}
            x2={L}
            y1={basY - t * (basY - 8)}
            y2={basY - t * (basY - 8)}
            stroke="#e2e8f0"
            strokeWidth={1}
          />
        ))}
        {points.map((p, i) => {
          const h = (p.valeur / max) * (basY - 12);
          const x = i * pas + (pas - largeurBarre) / 2;
          return (
            <g key={p.label}>
              <rect
                x={x}
                y={basY - h}
                width={largeurBarre}
                height={Math.max(h, p.valeur > 0 ? 3 : 0)}
                rx={4}
                fill="#1d66f0"
              >
                <title>{`${p.label} — ${formatMontant(p.valeur, devise)}`}</title>
              </rect>
              <text x={x + largeurBarre / 2} y={H - 6} textAnchor="middle" className="fill-slate-400 text-[9px]">
                {p.label}
              </text>
            </g>
          );
        })}
        <line x1={0} x2={L} y1={basY} y2={basY} stroke="#cbd5e1" strokeWidth={1} />
      </svg>
      <figcaption className="sr-only">
        Encaissements mensuels : {points.map((p) => `${p.label} ${formatMontant(p.valeur, devise)}`).join(', ')}.
      </figcaption>
    </figure>
  );
}
