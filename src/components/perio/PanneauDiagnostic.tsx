import type { ChartingParo } from '@/types';
import type { DiagnosticParo } from '@/data/perio';
import { Badge } from '@/components/ui/Badge';
import { Field, Input, Select } from '@/components/ui/Field';
import { cx } from '@/lib/utils';

const TON_STABILITE = {
  stable: 'succes',
  remission: 'info',
  instable: 'danger',
  non_evaluable: 'neutre',
} as const;

const LIBELLE_STABILITE = {
  stable: 'Parodonte stable',
  remission: 'En rémission',
  instable: 'Maladie active',
  non_evaluable: 'Non évaluable',
} as const;

function Indice({
  label,
  valeur,
  unite,
  alerte,
}: {
  label: string;
  valeur: number | string;
  unite?: string;
  alerte?: boolean;
}) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cx('mt-0.5 text-lg font-bold', alerte ? 'text-rose-700' : 'text-slate-900')}>
        {valeur}
        {unite ? <span className="ml-0.5 text-xs font-semibold text-slate-500">{unite}</span> : null}
      </p>
    </div>
  );
}

export function PanneauDiagnostic({
  diagnostic,
  charting,
  onChange,
  lectureSeule = false,
}: {
  diagnostic: DiagnosticParo;
  charting: ChartingParo;
  onChange: (patch: Partial<ChartingParo>) => void;
  lectureSeule?: boolean;
}) {
  const i = diagnostic.indices;

  return (
    <div className="space-y-4">
      <div
        className={cx(
          'rounded-xl border p-4',
          diagnostic.gingiviteSeule ? 'border-slate-200 bg-slate-50' : 'border-rose-200 bg-rose-50',
        )}
      >
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-lg font-bold text-slate-900">{diagnostic.libelle}</p>
          <Badge ton={TON_STABILITE[diagnostic.stabilite]}>{LIBELLE_STABILITE[diagnostic.stabilite]}</Badge>
        </div>
        {diagnostic.stade ? (
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge ton="danger">Stade {diagnostic.stade}</Badge>
            <Badge ton="alerte">Grade {diagnostic.grade}</Badge>
            <Badge ton="neutre">
              {diagnostic.etendue === 'generalisee'
                ? 'Généralisée'
                : diagnostic.etendue === 'localisee'
                  ? 'Localisée'
                  : 'Incisivo-molaire'}
            </Badge>
          </div>
        ) : null}
        <p className="mt-2 text-xs text-slate-500">
          Classification 2018 (AAP/EFP) appliquée aux mesures saisies. Le diagnostic final reste de la
          responsabilité du praticien.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Indice label="Saignement" valeur={i.bopPct} unite="%" alerte={i.bopPct >= 10} />
        <Indice label="Plaque" valeur={i.plaquePct} unite="%" alerte={i.plaquePct >= 20} />
        <Indice label="Poches ≥ 4 mm" valeur={i.poches4Pct} unite="%" alerte={i.poches4Pct > 0} />
        <Indice label="Poches ≥ 6 mm" valeur={i.poches6Pct} unite="%" alerte={i.poches6Pct > 0} />
        <Indice label="Poche max" valeur={i.pdMax} unite="mm" alerte={i.pdMax >= 6} />
        <Indice label="Perte d’attache max" valeur={i.calInterdentaireMax} unite="mm" />
        <Indice label="Furcations" valeur={i.furcationsAtteintes} alerte={i.furcationsAtteintes > 0} />
        <Indice label="Sites sondés" valeur={i.sitesSondes} />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Perte osseuse radio (%)" aide="Mesurée sur la dent la plus atteinte.">
          <Input
            type="number"
            min={0}
            max={100}
            disabled={lectureSeule}
            value={charting.perteOsseusePct ?? ''}
            placeholder="—"
            onChange={(e) =>
              onChange({ perteOsseusePct: e.target.value === '' ? null : Number(e.target.value) })
            }
          />
        </Field>
        <Field label="Tabac">
          <Select
            value={charting.fumeur}
            disabled={lectureSeule}
            onChange={(e) => onChange({ fumeur: e.target.value as ChartingParo['fumeur'] })}
          >
            <option value="non">Non fumeur</option>
            <option value="moins_10">&lt; 10 cigarettes/jour</option>
            <option value="dix_ou_plus">≥ 10 cigarettes/jour</option>
          </Select>
        </Field>
        <Field label="Diabète">
          <Select
            value={charting.diabete}
            disabled={lectureSeule}
            onChange={(e) => onChange({ diabete: e.target.value as ChartingParo['diabete'] })}
          >
            <option value="non">Absent</option>
            <option value="equilibre">Équilibré (HbA1c &lt; 7 %)</option>
            <option value="desequilibre">Déséquilibré (HbA1c ≥ 7 %)</option>
          </Select>
        </Field>
      </div>

      <details className="rounded-lg border border-slate-200 bg-white p-3" open>
        <summary className="cursor-pointer text-sm font-semibold text-slate-700">
          Raisonnement ({diagnostic.justifications.length} critères)
        </summary>
        <ul className="mt-2 space-y-1.5 text-sm text-slate-600">
          {diagnostic.justifications.map((j, k) => (
            <li key={k} className="flex gap-2">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-brand-500" />
              {j}
            </li>
          ))}
        </ul>
      </details>
    </div>
  );
}
