import { useState } from 'react';
import { useApp } from '@/store/AppContext';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { formatDateHeure } from '@/lib/utils';

/**
 * Écran de déverrouillage du coffre. Tant que la phrase secrète n'est pas
 * fournie, aucune donnée patient n'est en mémoire : le magasin reste scellé.
 */
export function EcranVerrouillage() {
  const { enveloppeVerrouillee, deverrouiller } = useApp();
  const [phrase, setPhrase] = useState('');
  const [erreur, setErreur] = useState('');
  const [occupe, setOccupe] = useState(false);

  if (!enveloppeVerrouillee) return null;

  const soumettre = async () => {
    if (!phrase) {
      setErreur('Saisissez la phrase secrète du cabinet.');
      return;
    }
    setOccupe(true);
    setErreur('');
    try {
      await deverrouiller(phrase);
      setPhrase('');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : 'Déverrouillage impossible.');
    } finally {
      setOccupe(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 p-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-7 shadow-2xl">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-600 text-white">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v10H5V10Zm7 4v2"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <div>
            <h1 className="text-lg font-bold text-slate-900">Coffre verrouillé</h1>
            <p className="text-sm text-slate-500">Dossiers chiffrés sur ce poste</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void soumettre();
          }}
        >
          <label className="etiquette" htmlFor="phrase-secrete">
            Phrase secrète
          </label>
          <Input
            id="phrase-secrete"
            type="password"
            autoFocus
            autoComplete="current-password"
            value={phrase}
            onChange={(e) => setPhrase(e.target.value)}
            placeholder="••••••••••••"
          />
          {erreur ? (
            <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {erreur}
            </p>
          ) : null}
          <Button type="submit" className="mt-4 w-full" taille="lg" disabled={occupe}>
            {occupe ? 'Déverrouillage…' : 'Déverrouiller'}
          </Button>
        </form>

        <p className="mt-5 border-t border-slate-200 pt-4 text-xs leading-relaxed text-slate-500">
          Dernier scellement : {formatDateHeure(enveloppeVerrouillee.scelleLe)}.
          <br />
          Chiffrement AES-256-GCM, clé dérivée par PBKDF2-SHA-256. La phrase secrète n’est stockée nulle
          part : sans elle, les données sont irrécupérables.
        </p>
      </div>
    </div>
  );
}
