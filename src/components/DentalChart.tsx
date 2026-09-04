import { useId, useMemo } from "react";
import type { DentEtat, Dentition, EtatDent, Face } from "@/types";
import {
  ETATS,
  arcades,
  estDroite,
  estMaxillaire,
  facesDisponibles,
  nomDent,
  typeDent,
} from "@/data/teeth";
import { cx } from "@/lib/utils";

const CELLULE = 46;
const DENT = 40;
const MARGE_CELLULE = (CELLULE - DENT) / 2;
const ECART_MEDIAN = 18;
const HAUTEUR_LABEL = 16;
const Y_HAUT = HAUTEUR_LABEL + 4;
const Y_BAS = Y_HAUT + DENT + 34;

/** Screen position of a face for a given tooth, so the chart is anatomically correct. */
export function faceParZone(
  numero: number,
  zone: "haut" | "bas" | "gauche" | "droite" | "centre",
): Face {
  switch (zone) {
    case "haut":
      return estMaxillaire(numero) ? "V" : "L";
    case "bas":
      return estMaxillaire(numero) ? "L" : "V";
    case "droite":
      return estDroite(numero) ? "M" : "D";
    case "gauche":
      return estDroite(numero) ? "D" : "M";
    default:
      return "O";
  }
}

const ZONES = ["haut", "droite", "bas", "gauche", "centre"] as const;
type Zone = (typeof ZONES)[number];

/** Polygon points for each clickable zone inside a 40×40 tooth cell. */
function polygone(zone: Zone): string {
  const a = 0;
  const b = DENT;
  const i1 = 12;
  const i2 = DENT - 12;
  switch (zone) {
    case "haut":
      return `${a},${a} ${b},${a} ${i2},${i1} ${i1},${i1}`;
    case "droite":
      return `${b},${a} ${b},${b} ${i2},${i2} ${i2},${i1}`;
    case "bas":
      return `${a},${b} ${i1},${i2} ${i2},${i2} ${b},${b}`;
    case "gauche":
      return `${a},${a} ${i1},${i1} ${i1},${i2} ${a},${b}`;
    default:
      return `${i1},${i1} ${i2},${i1} ${i2},${i2} ${i1},${i2}`;
  }
}

function xDent(index: number, total: number): number {
  const moitie = total / 2;
  return index * CELLULE + (index >= moitie ? ECART_MEDIAN : 0);
}

export interface DentalChartProps {
  dentition: Dentition;
  /** Clinical states, keyed by FDI number. */
  etats: Record<number, DentEtat>;
  selection: number[];
  onSelectionDent: (numero: number, evenement: { ctrl: boolean }) => void;
  /** When set, clicking a surface paints it with this state instead of selecting. */
  pinceau?: EtatDent | null;
  onPeindreFace?: (numero: number, face: Face) => void;
  className?: string;
  /** Read-only rendering for printing or history views. */
  lectureSeule?: boolean;
}

export function DentalChart({
  dentition,
  etats,
  selection,
  onSelectionDent,
  pinceau = null,
  onPeindreFace,
  className,
  lectureSeule = false,
}: DentalChartProps) {
  const idBase = useId().replace(/:/g, "");
  const { haut, bas } = useMemo(() => arcades(dentition), [dentition]);
  const total = haut.length;
  const largeur = total * CELLULE + ECART_MEDIAN;
  const hauteur = Y_BAS + DENT + HAUTEUR_LABEL + 6;

  const rendreDent = (numero: number, index: number, y: number) => {
    const etat = etats[numero];
    const meta = ETATS[etat?.etat ?? "saine"];
    const faces = etat?.faces ?? [];
    const disponibles = facesDisponibles(numero);
    const estSelectionnee = selection.includes(numero);
    const x = xDent(index, total) + MARGE_CELLULE;
    const marqueeEntierement =
      !!etat && etat.etat !== "saine" && faces.length === 0;
    const absente = etat?.etat === "absente";
    const yLabel = y === Y_HAUT ? y - 6 : y + DENT + 13;
    const rayon = typeDent(numero) === "molaire" ? 6 : 10;
    const clipId = `${idBase}-dent-${numero}`;

    return (
      <g key={numero} className={lectureSeule ? undefined : "cursor-pointer"}>
        <text
          x={xDent(index, total) + CELLULE / 2}
          y={yLabel}
          textAnchor="middle"
          className={cx(
            "select-none text-[11px] font-semibold",
            estSelectionnee ? "fill-brand-700" : "fill-slate-500",
          )}
        >
          {numero}
        </text>

        <g transform={`translate(${x} ${y})`}>
          {/* Selection halo */}
          {estSelectionnee ? (
            <rect
              x={-4}
              y={-4}
              width={DENT + 8}
              height={DENT + 8}
              rx={8}
              className="fill-brand-100 stroke-brand-500"
              strokeWidth={2}
            />
          ) : null}

          <defs>
            <clipPath id={clipId}>
              <rect x={0} y={0} width={DENT} height={DENT} rx={rayon} />
            </clipPath>
          </defs>

          <g clipPath={`url(#${clipId})`}>
            {ZONES.map((zone) => {
              const face = faceParZone(numero, zone);
              const utilisable = disponibles.includes(face);
              const active = marqueeEntierement || faces.includes(face);
              const remplissage =
                utilisable && active ? meta.couleur : "#ffffff";
              const titre = utilisable
                ? `Dent ${numero} — face ${face}`
                : `Dent ${numero}`;
              return (
                <polygon
                  key={zone}
                  points={polygone(zone)}
                  fill={remplissage}
                  aria-label={titre}
                  stroke={active ? meta.bordure : "#cbd5e1"}
                  strokeWidth={active ? 1.2 : 1}
                  onClick={
                    lectureSeule
                      ? undefined
                      : (e) => {
                          e.stopPropagation();
                          if (pinceau && utilisable && onPeindreFace)
                            onPeindreFace(numero, face);
                          else
                            onSelectionDent(numero, {
                              ctrl: e.ctrlKey || e.metaKey || e.shiftKey,
                            });
                        }
                  }
                >
                  <title>{titre}</title>
                </polygon>
              );
            })}
          </g>

          {/* Outline + missing-tooth cross */}
          <rect
            x={0}
            y={0}
            width={DENT}
            height={DENT}
            rx={rayon}
            fill="none"
            stroke={etat && etat.etat !== "saine" ? meta.bordure : "#94a3b8"}
            strokeWidth={estSelectionnee ? 2 : 1.2}
            pointerEvents="none"
          />
          {absente ? (
            <g
              pointerEvents="none"
              stroke="#475569"
              strokeWidth={2.4}
              strokeLinecap="round"
            >
              <line x1={6} y1={6} x2={DENT - 6} y2={DENT - 6} />
              <line x1={DENT - 6} y1={6} x2={6} y2={DENT - 6} />
            </g>
          ) : null}
          {etat?.note ? (
            <circle
              cx={DENT - 4}
              cy={4}
              r={3.5}
              fill="#0f172a"
              pointerEvents="none"
            >
              <title>{etat.note}</title>
            </circle>
          ) : null}
        </g>
      </g>
    );
  };

  return (
    <div className={cx("w-full overflow-x-auto", className)}>
      <svg
        viewBox={`0 0 ${largeur} ${hauteur}`}
        width="100%"
        role="img"
        aria-label="Schéma dentaire interactif"
        style={{ minWidth: Math.min(largeur, 620) }}
      >
        {/* Midline and arch separator */}
        <line
          x1={largeur / 2}
          y1={4}
          x2={largeur / 2}
          y2={hauteur - 4}
          stroke="#cbd5e1"
          strokeDasharray="4 4"
          strokeWidth={1}
        />
        <line
          x1={0}
          y1={(Y_HAUT + DENT + Y_BAS) / 2}
          x2={largeur}
          y2={(Y_HAUT + DENT + Y_BAS) / 2}
          stroke="#e2e8f0"
          strokeWidth={1}
        />
        <text
          x={4}
          y={(Y_HAUT + DENT + Y_BAS) / 2 - 5}
          className="fill-slate-400 text-[10px]"
        >
          Maxillaire
        </text>
        <text
          x={4}
          y={(Y_HAUT + DENT + Y_BAS) / 2 + 13}
          className="fill-slate-400 text-[10px]"
        >
          Mandibule
        </text>

        {haut.map((n, i) => rendreDent(n, i, Y_HAUT))}
        {bas.map((n, i) => rendreDent(n, i, Y_BAS))}
      </svg>
    </div>
  );
}

export function LegendeEtats({
  pinceau,
  onPinceau,
}: {
  pinceau?: EtatDent | null;
  onPinceau?: (e: EtatDent | null) => void;
}) {
  const entrees = Object.entries(ETATS) as Array<
    [EtatDent, (typeof ETATS)[EtatDent]]
  >;
  return (
    <div className="flex flex-wrap gap-1.5">
      {entrees.map(([cle, meta]) => {
        const actif = pinceau === cle;
        return (
          <button
            key={cle}
            type="button"
            onClick={() => onPinceau?.(actif ? null : cle)}
            disabled={!onPinceau}
            className={cx(
              "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition",
              onPinceau
                ? "hover:ring-2 hover:ring-brand-200"
                : "cursor-default",
              actif ? "ring-2 ring-brand-500 ring-offset-1" : "",
              meta.chip,
            )}
            title={onPinceau ? `Peindre : ${meta.libelle}` : meta.libelle}
          >
            <span
              className="h-2.5 w-2.5 rounded-full border"
              style={{ background: meta.couleur, borderColor: meta.bordure }}
            />
            {meta.libelle}
          </button>
        );
      })}
    </div>
  );
}

export { nomDent };
