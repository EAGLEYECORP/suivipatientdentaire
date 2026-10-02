import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Card, CardBody, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Field, Input, Select } from '@/components/ui/Field';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { chiffrementDisponible, forcePhrase, ITERATIONS_PBKDF2 } from '@/lib/crypto';
import { cx } from '@/lib/utils';

const COULEURS_FORCE = ['bg-red-500', 'bg-orange-500', 'bg-amber-400', 'bg-lime-500', 'bg-emerald-500'];

export function SectionSecurite() {
  const { data, etatCoffre, activerProtection, desactiverProtection, verrouiller, majCabinet } = useApp();
  const [phrase, setPhrase] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [desactivation, setDesactivation] = useState(false);

  const force = forcePhrase(phrase);
  const disponible = chiffrementDisponible();

  const activer = async () => {
    if (phrase.length < 10) {
      setErreur('La phrase secrète doit faire au moins 10 caractères.');
      return;
    }
    if (phrase !== confirmation) {
      setErreur('Les deux saisies ne correspondent pas.');
      return;
    }
    setOccupe(true);
    setErreur('');
    try {
      await activerProtection(phrase);
      setPhrase('');
      setConfirmation('');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Activation impossible.');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <Card>
      <CardHeader
        titre="Sécurité et confidentialité"
        sousTitre="Chiffrement du dossier au repos, sur ce poste"
      />
      <CardBody className="space-y-4">
        {!disponible ? (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
            Le chiffrement exige un contexte sécurisé. Ouvrez l’application en HTTPS (ou sur localhost) pour
            pouvoir activer le coffre.
          </p>
        ) : null}

        {etatCoffre === 'ouvert' ? (
          <>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
              <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-600 text-white">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5V10Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-emerald-900">Coffre actif</p>
                <p className="text-sm text-emerald-800">
                  Dossiers et clichés chiffrés en AES-256-GCM. La clé vit en mémoire et disparaît à la
                  fermeture de l’onglet.
                </p>
              </div>
              <Button variante="secondaire" onClick={verrouiller}>
                Verrouiller maintenant
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Verrouillage automatique"
                aide="Au-delà de ce délai sans activité, le coffre se referme."
              >
                <Select
                  value={data.cabinet.verrouillageMinutes}
                  onChange={(e) => majCabinet({ verrouillageMinutes: Number(e.target.value) })}
                >
                  <option value={0}>Jamais</option>
                  <option value={5}>5 minutes</option>
                  <option value={15}>15 minutes</option>
                  <option value={30}>30 minutes</option>
                  <option value={60}>1 heure</option>
                </Select>
              </Field>
              <div className="flex items-end">
                <Button variante="danger" onClick={() => setDesactivation(true)}>
                  Désactiver le chiffrement
                </Button>
              </div>
            </div>
          </>
        ) : (
          <>
            <p className="text-sm text-slate-600">
              Sans coffre, le dossier est lisible par toute personne ayant accès à la session de ce poste.
              En l’activant, l’intégralité des données — dossiers, sondages, radios — est chiffrée avec une
              clé dérivée de votre phrase secrète ({ITERATIONS_PBKDF2.toLocaleString('fr-FR')} itérations
              PBKDF2-SHA-256).
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Phrase secrète du cabinet">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={phrase}
                  onChange={(e) => setPhrase(e.target.value)}
                  disabled={!disponible}
                />
                {phrase ? (
                  <span className="mt-1.5 block">
                    <span className="flex gap-1">
                      {[0, 1, 2, 3].map((i) => (
                        <span
                          key={i}
                          className={cx(
                            'h-1 flex-1 rounded-full',
                            i < force.score ? COULEURS_FORCE[force.score] : 'bg-slate-200',
                          )}
                        />
                      ))}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">Robustesse : {force.libelle}</span>
                  </span>
                ) : null}
              </Field>
              <Field label="Confirmer la phrase secrète">
                <Input
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(e) => setConfirmation(e.target.value)}
                  disabled={!disponible}
                />
              </Field>
            </div>

            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              <strong>Cette phrase n’est stockée nulle part.</strong> Si elle est perdue, les données sont
              définitivement irrécupérables : notez-la en lieu sûr et exportez une sauvegarde avant
              d’activer le coffre.
            </p>

            {erreur ? (
              <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {erreur}
              </p>
            ) : null}

            <Button onClick={() => void activer()} disabled={occupe || !disponible}>
              {occupe ? 'Chiffrement en cours…' : 'Activer le chiffrement'}
            </Button>
          </>
        )}

        <ConfirmDialog
          ouvert={desactivation}
          titre="Désactiver le chiffrement"
          message="Les données seront réécrites en clair sur ce poste et redeviendront lisibles sans phrase secrète."
          libelleConfirmer="Désactiver"
          onAnnuler={() => setDesactivation(false)}
          onConfirmer={() => {
            desactiverProtection();
            setDesactivation(false);
          }}
        />
      </CardBody>
    </Card>
  );
}
