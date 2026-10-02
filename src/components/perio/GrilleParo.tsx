import { useCallback, useRef } from 'react';
import type { ChartingParo, DentPerio, MesureSite, SitePerio } from '@/types';
import { SITES_LINGUAUX, SITES_VESTIBULAIRES, couleurPoche, estPluriradiculee } from '@/data/perio';
import { arcades } from '@/data/teeth';
import { cx } from '@/lib/utils';

type Aspect = 'V' | 'L';

const ASPECTS: Array<{ aspect: Aspect; sites: SitePerio[] }> = [
  { aspect: 'V', sites: SITES_VESTIBULAIRES },
  { aspect: 'L', sites: SITES_LINGUAUX },
];

export interface GrilleParoProps {
  charting: ChartingParo;
  onChange: (dents: DentPerio[]) => void;
  /** Dents absentes : grisées et exclues du sondage. */
  absentes: number[];
  lectureSeule?: boolean;
}

/** Ordre de parcours au clavier : arcade par arcade, vestibulaire puis lingual. */
function idCellule(numero: number, site: SitePerio, champ: 'pd' | 'rec'): string {
  return `paro-${champ}-${numero}-${site}`;
}

export function GrilleParo({ charting, onChange, absentes, lectureSeule = false }: GrilleParoProps) {
  const ordre = useRef<string[]>([]);
  const { haut, bas } = arcades('permanente');

  const parNumero = new Map(charting.dents.map((d) => [d.numero, d]));

  const majSite = useCallback(
    (numero: number, site: SitePerio, patch: Partial<MesureSite>) => {
      onChange(
        charting.dents.map((d) =>
          d.numero === numero ? { ...d, sites: { ...d.sites, [site]: { ...d.sites[site], ...patch } } } : d,
        ),
      );
    },
    [charting.dents, onChange],
  );

  const majDent = useCallback(
    (numero: number, patch: Partial<DentPerio>) => {
      onChange(charting.dents.map((d) => (d.numero === numero ? { ...d, ...patch } : d)));
    },
    [charting.dents, onChange],
  );

  const avancer = (idCourant: string, pas: 1 | -1) => {
    const liste = ordre.current;
    const i = liste.indexOf(idCourant);
    if (i === -1) return;
    const suivant = liste[i + pas];
    if (!suivant) return;
    document.getElementById(suivant)?.focus();
    (document.getElementById(suivant) as HTMLInputElement | null)?.select();
  };

  const CelluleMesure = ({
    numero,
    site,
    champ,
  }: {
    numero: number;
    site: SitePerio;
    champ: 'pd' | 'rec';
  }) => {
    const dent = parNumero.get(numero);
    const mesure = dent?.sites[site];
    const id = idCellule(numero, site, champ);
    if (!ordre.current.includes(id)) ordre.current.push(id);
    const absente = absentes.includes(numero);
    // Une dent absente n'affiche aucune mesure, même si l'historique en contient.
    const valeur = absente || !mesure ? null : champ === 'pd' ? mesure.pd : mesure.rec;

    return (
      <input
        id={id}
        inputMode="numeric"
        disabled={absente || lectureSeule}
        aria-label={`${champ === 'pd' ? 'Profondeur' : 'Récession'} dent ${numero} site ${site}`}
        value={valeur === null || valeur === undefined ? '' : String(valeur)}
        onFocus={(e) => e.currentTarget.select()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === 'ArrowRight') {
            e.preventDefault();
            avancer(id, 1);
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault();
            avancer(id, -1);
          } else if (e.key.toLowerCase() === 's' && champ === 'pd') {
            e.preventDefault();
            majSite(numero, site, { bop: !mesure?.bop });
          } else if (e.key.toLowerCase() === 'p' && champ === 'pd') {
            e.preventDefault();
            majSite(numero, site, { plaque: !mesure?.plaque });
          } else if (e.key.toLowerCase() === 'u' && champ === 'pd') {
            e.preventDefault();
            majSite(numero, site, { pus: !mesure?.pus });
          }
        }}
        onChange={(e) => {
          const brut = e.target.value.replace(/[^\d-]/g, '').slice(0, 2);
          if (brut === '' || brut === '-') {
            majSite(numero, site, { [champ]: null } as Partial<MesureSite>);
            return;
          }
          const n = Number.parseInt(brut, 10);
          if (!Number.isFinite(n)) return;
          const borne = champ === 'pd' ? Math.min(15, Math.max(0, n)) : Math.min(15, Math.max(-5, n));
          // Saisie en rafale : on enchaîne dès que le chiffre est non ambigu.
          const ambigu = brut === '1';
          majSite(
            numero,
            site,
            champ === 'pd'
              ? { pd: borne, bop: borne >= 4 ? (mesure?.bop ?? false) : (mesure?.bop ?? false) }
              : { rec: borne },
          );
          if (!ambigu) setTimeout(() => avancer(id, 1), 0);
        }}
        className={cx(
          'h-7 w-full border border-slate-200 text-center text-[11px] font-semibold tabular-nums outline-none',
          'focus:relative focus:z-10 focus:ring-2 focus:ring-brand-500',
          absente && 'bg-slate-100 text-slate-300',
        )}
        style={
          champ === 'pd' && !absente && valeur !== null
            ? { background: couleurPoche(valeur), color: (valeur ?? 0) >= 6 ? '#fff' : '#0f172a' }
            : undefined
        }
      />
    );
  };

  const CelluleDrapeau = ({
    numero,
    site,
    champ,
  }: {
    numero: number;
    site: SitePerio;
    champ: 'bop' | 'plaque' | 'pus';
  }) => {
    const dent = parNumero.get(numero);
    const actif = dent?.sites[site][champ] ?? false;
    const absente = absentes.includes(numero);
    const couleurs = {
      bop: 'bg-red-500 border-red-600',
      plaque: 'bg-amber-400 border-amber-500',
      pus: 'bg-fuchsia-500 border-fuchsia-600',
    } as const;
    const libelles = { bop: 'saignement', plaque: 'plaque', pus: 'suppuration' } as const;
    return (
      <button
        type="button"
        disabled={absente || lectureSeule}
        aria-label={`${libelles[champ]} dent ${numero} site ${site}`}
        aria-pressed={actif}
        onClick={() => majSite(numero, site, { [champ]: !actif } as Partial<MesureSite>)}
        className={cx(
          'h-4 w-full border',
          actif ? couleurs[champ] : 'border-slate-200 bg-white hover:bg-slate-100',
          absente && 'cursor-not-allowed bg-slate-100',
        )}
      />
    );
  };

  const LigneSites = ({
    dents,
    sites,
    rendu,
    label,
    aide,
  }: {
    dents: number[];
    sites: SitePerio[];
    rendu: (numero: number, site: SitePerio) => JSX.Element;
    label: string;
    aide?: string;
  }) => (
    <tr>
      <th
        scope="row"
        className="sticky left-0 z-10 whitespace-nowrap bg-white px-2 py-0.5 text-right text-[11px] font-medium text-slate-500"
        title={aide}
      >
        {label}
      </th>
      {dents.map((numero) => (
        <td key={numero} className="px-px">
          <div className="grid grid-cols-3 gap-px">
            {sites.map((s) => (
              <div key={s}>{rendu(numero, s)}</div>
            ))}
          </div>
        </td>
      ))}
    </tr>
  );

  const Arcade = ({ dents, titre }: { dents: number[]; titre: string }) => (
    <table className="w-full border-separate border-spacing-0">
      <caption className="sticky left-0 pb-1 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
        {titre}
      </caption>
      <thead>
        <tr>
          <th className="sticky left-0 z-10 bg-white" />
          {dents.map((n) => (
            <th
              key={n}
              scope="col"
              className={cx(
                'px-px pb-1 text-center text-[11px] font-bold',
                absentes.includes(n) ? 'text-slate-300 line-through' : 'text-slate-700',
              )}
            >
              {n}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {ASPECTS.map(({ aspect, sites }) => (
          <>
            <LigneSites
              key={`${aspect}-plaque`}
              dents={dents}
              sites={sites}
              label={aspect === 'V' ? 'Plaque vest.' : 'Plaque ling.'}
              aide="Présence de plaque au site"
              rendu={(n, s) => <CelluleDrapeau numero={n} site={s} champ="plaque" />}
            />
            <LigneSites
              key={`${aspect}-bop`}
              dents={dents}
              sites={sites}
              label={aspect === 'V' ? 'Saignement' : 'Saignement'}
              aide="Saignement au sondage"
              rendu={(n, s) => <CelluleDrapeau numero={n} site={s} champ="bop" />}
            />
            <LigneSites
              key={`${aspect}-pd`}
              dents={dents}
              sites={sites}
              label={aspect === 'V' ? 'Poche vest. (mm)' : 'Poche ling. (mm)'}
              aide="Profondeur de sondage"
              rendu={(n, s) => <CelluleMesure numero={n} site={s} champ="pd" />}
            />
            <LigneSites
              key={`${aspect}-rec`}
              dents={dents}
              sites={sites}
              label={aspect === 'V' ? 'Marge vest.' : 'Marge ling.'}
              aide="Position de la marge gingivale par rapport à la JEC (négatif = marge coronaire)"
              rendu={(n, s) => <CelluleMesure numero={n} site={s} champ="rec" />}
            />
            <tr key={`${aspect}-sep`}>
              <td colSpan={dents.length + 1} className="h-2" />
            </tr>
          </>
        ))}
        <tr>
          <th
            scope="row"
            className="sticky left-0 z-10 bg-white px-2 py-0.5 text-right text-[11px] font-medium text-slate-500"
          >
            Mobilité
          </th>
          {dents.map((n) => (
            <td key={n} className="px-px">
              <select
                aria-label={`Mobilité dent ${n}`}
                disabled={absentes.includes(n) || lectureSeule}
                value={parNumero.get(n)?.mobilite ?? 0}
                onChange={(e) => majDent(n, { mobilite: Number(e.target.value) as DentPerio['mobilite'] })}
                className="h-6 w-full border border-slate-200 bg-white text-center text-[11px] disabled:bg-slate-100"
              >
                {[0, 1, 2, 3].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </td>
          ))}
        </tr>
        <tr>
          <th
            scope="row"
            className="sticky left-0 z-10 bg-white px-2 py-0.5 text-right text-[11px] font-medium text-slate-500"
          >
            Furcation
          </th>
          {dents.map((n) => (
            <td key={n} className="px-px">
              {estPluriradiculee(n) ? (
                <select
                  aria-label={`Furcation dent ${n}`}
                  disabled={absentes.includes(n) || lectureSeule}
                  value={parNumero.get(n)?.furcation ?? 0}
                  onChange={(e) =>
                    majDent(n, { furcation: Number(e.target.value) as DentPerio['furcation'] })
                  }
                  className="h-6 w-full border border-slate-200 bg-white text-center text-[11px] disabled:bg-slate-100"
                >
                  {[0, 1, 2, 3].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-6 border border-slate-100 bg-slate-50" />
              )}
            </td>
          ))}
        </tr>
      </tbody>
    </table>
  );

  return (
    <div className="space-y-6 overflow-x-auto pb-2">
      <div className="min-w-[980px] space-y-6">
        <Arcade dents={haut} titre="Arcade maxillaire" />
        <Arcade dents={bas} titre="Arcade mandibulaire" />
      </div>
    </div>
  );
}
