import type { Acte, DentEtat, EtatDent, EvenementJournal, Face } from '@/types';
import { ETATS, LIBELLE_FACE, LISTE_ETATS, facesDisponibles, nomDent } from '@/data/teeth';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Field';
import { cx, formatDate, formatDateHeure } from '@/lib/utils';
import { useChampDiffere } from '@/lib/champDiffere';

interface Props {
  numero: number;
  etat: DentEtat | undefined;
  actes: Acte[];
  /** Journal filtré sur cette dent, du plus récent au plus ancien. */
  biographie: EvenementJournal[];
  onChangerEtat: (e: EtatDent) => void;
  onBasculerFace: (f: Face) => void;
  onNote: (note: string) => void;
  onReinitialiser: () => void;
  onAjouterActe: () => void;
}

export function ToothPanel({
  numero,
  etat,
  actes,
  biographie,
  onChangerEtat,
  onBasculerFace,
  onNote,
  onReinitialiser,
  onAjouterActe,
}: Props) {
  const courant: EtatDent = etat?.etat ?? 'saine';
  const faces = etat?.faces ?? [];
  const disponibles = facesDisponibles(numero);
  const note = useChampDiffere(etat?.note ?? '', onNote);

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-sm font-bold text-white">
            {numero}
          </span>
          <div>
            <p className="text-sm font-semibold text-slate-900">{nomDent(numero)}</p>
            <p className="text-xs text-slate-500">
              {etat ? `Mise à jour ${formatDate(etat.majLe)}` : 'Aucune anomalie enregistrée'}
            </p>
          </div>
        </div>
      </div>

      <div>
        <span className="etiquette">État clinique</span>
        <div className="flex flex-wrap gap-1.5">
          {LISTE_ETATS.map((cle) => {
            const meta = ETATS[cle];
            const actif = courant === cle;
            return (
              <button
                key={cle}
                type="button"
                onClick={() => onChangerEtat(cle)}
                className={cx(
                  'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition',
                  meta.chip,
                  actif ? 'ring-2 ring-brand-500 ring-offset-1' : 'opacity-80 hover:opacity-100',
                )}
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
      </div>

      <div>
        <span className="etiquette">Faces atteintes</span>
        <div className="flex flex-wrap gap-1.5">
          {disponibles.map((f) => {
            const actif = faces.includes(f);
            return (
              <button
                key={f}
                type="button"
                onClick={() => onBasculerFace(f)}
                className={cx(
                  'rounded-lg border px-2.5 py-1.5 text-xs font-medium transition',
                  actif
                    ? 'border-brand-600 bg-brand-600 text-white'
                    : 'border-slate-300 bg-white text-slate-600 hover:border-brand-300',
                )}
                title={LIBELLE_FACE[f]}
              >
                {f}
              </button>
            );
          })}
        </div>
        <p className="mt-1 text-xs text-slate-400">
          Sans face sélectionnée, l’état s’applique à la dent entière.
        </p>
      </div>

      <div>
        <span className="etiquette">Note clinique sur la dent</span>
        <Textarea
          rows={3}
          value={note.brouillon}
          placeholder="Sensibilité au froid, radio à contrôler…"
          onChange={(e) => note.setBrouillon(e.target.value)}
          onBlur={note.engagerMaintenant}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button taille="sm" onClick={onAjouterActe}>
          + Acte sur cette dent
        </Button>
        <Button taille="sm" variante="secondaire" onClick={onReinitialiser}>
          Réinitialiser
        </Button>
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Biographie de la dent ({biographie.length})
        </p>
        {biographie.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun événement enregistré sur cette dent.</p>
        ) : (
          <ol className="relative space-y-2 border-l border-slate-200 pl-4">
            {biographie.slice(0, 8).map((e) => (
              <li key={e.id} className="relative text-sm">
                <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-500" />
                <p className="text-slate-700">{e.resume}</p>
                <p className="text-xs text-slate-400">
                  {formatDateHeure(e.date)} · {e.auteur}
                </p>
              </li>
            ))}
          </ol>
        )}
      </div>

      <div>
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
          Actes liés ({actes.length})
        </p>
        {actes.length === 0 ? (
          <p className="text-sm text-slate-400">Aucun acte enregistré pour cette dent.</p>
        ) : (
          <ul className="space-y-2">
            {actes.map((a) => (
              <li key={a.id} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium text-slate-800">{a.libelle}</span>
                  <Badge
                    ton={
                      a.statut === 'realise'
                        ? 'succes'
                        : a.statut === 'annule'
                          ? 'danger'
                          : a.statut === 'en_cours'
                            ? 'violet'
                            : 'neutre'
                    }
                  >
                    {a.statut === 'realise'
                      ? 'Réalisé'
                      : a.statut === 'en_cours'
                        ? 'En cours'
                        : a.statut === 'annule'
                          ? 'Annulé'
                          : 'Planifié'}
                  </Badge>
                </div>
                <p className="mt-0.5 text-xs text-slate-500">
                  {a.codeActe} · {formatDate(a.dateRealisation ?? a.datePrevue)} · {a.praticien}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
