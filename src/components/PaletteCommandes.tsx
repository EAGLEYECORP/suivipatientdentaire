import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/store/AppContext';
import { age, correspond, cx, initiales } from '@/lib/utils';

interface Commande {
  id: string;
  titre: string;
  sousTitre?: string;
  groupe: 'Patients' | 'Navigation' | 'Actions';
  /** Termes supplémentaires pris en compte par la recherche. */
  motsCles?: string;
  executer: () => void;
}

/**
 * Palette de commandes (⌘K / Ctrl+K).
 *
 * Au fauteuil, chercher un patient à la souris coûte du temps. La palette
 * ouvre n'importe quel dossier, n'importe quel écran et les actions
 * courantes sans quitter le clavier.
 */
export function PaletteCommandes() {
  const { data, etatCoffre, verrouiller } = useApp();
  const navigate = useNavigate();
  const [ouverte, setOuverte] = useState(false);
  const [requete, setRequete] = useState('');
  const [index, setIndex] = useState(0);
  const champ = useRef<HTMLInputElement>(null);
  const liste = useRef<HTMLUListElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOuverte((v) => !v);
        setRequete('');
        setIndex(0);
      }
      if (e.key === 'Escape') setOuverte(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (ouverte) setTimeout(() => champ.current?.focus(), 10);
  }, [ouverte]);

  const commandes = useMemo<Commande[]>(() => {
    const aller = (chemin: string) => () => {
      navigate(chemin);
      setOuverte(false);
    };

    const navigation: Commande[] = [
      { id: 'nav-accueil', titre: 'Tableau de bord', groupe: 'Navigation', executer: aller('/') },
      { id: 'nav-patients', titre: 'Patients', groupe: 'Navigation', executer: aller('/patients') },
      { id: 'nav-agenda', titre: 'Agenda', groupe: 'Navigation', motsCles: 'rendez-vous planning', executer: aller('/agenda') },
      { id: 'nav-traitements', titre: 'Traitements', groupe: 'Navigation', motsCles: 'actes plan', executer: aller('/traitements') },
      { id: 'nav-facturation', titre: 'Facturation', groupe: 'Navigation', motsCles: 'factures paiements', executer: aller('/facturation') },
      { id: 'nav-pilotage', titre: 'Pilotage', groupe: 'Navigation', motsCles: 'statistiques indicateurs rappels', executer: aller('/pilotage') },
      { id: 'nav-parametres', titre: 'Paramètres', groupe: 'Navigation', motsCles: 'cabinet praticiens sécurité', executer: aller('/parametres') },
    ];

    const actions: Commande[] = [
      {
        id: 'act-patient',
        titre: 'Nouveau patient',
        sousTitre: 'Créer un dossier',
        groupe: 'Actions',
        motsCles: 'ajouter créer dossier',
        executer: () => {
          navigate('/patients?nouveau=1');
          setOuverte(false);
        },
      },
      {
        id: 'act-rdv',
        titre: 'Nouveau rendez-vous',
        groupe: 'Actions',
        motsCles: 'planifier agenda',
        executer: () => {
          navigate('/agenda?nouveau=1');
          setOuverte(false);
        },
      },
    ];

    if (etatCoffre === 'ouvert') {
      actions.push({
        id: 'act-verrou',
        titre: 'Verrouiller le coffre',
        sousTitre: 'Masquer immédiatement tous les dossiers',
        groupe: 'Actions',
        motsCles: 'sécurité chiffrement fermer',
        executer: () => {
          verrouiller();
          setOuverte(false);
        },
      });
    }

    const patients: Commande[] = data.patients.map((p) => ({
      id: `pat-${p.id}`,
      titre: `${p.prenom} ${p.nom}`,
      sousTitre: `${age(p.dateNaissance)} ans · ${p.telephone}`,
      groupe: 'Patients',
      motsCles: `${p.email} ${p.numeroSecu} ${p.mutuelle}`,
      executer: () => {
        navigate(`/patients/${p.id}`);
        setOuverte(false);
      },
    }));

    return [...patients, ...navigation, ...actions];
  }, [data.patients, etatCoffre, navigate, verrouiller]);

  const resultats = useMemo(() => {
    const filtrees = commandes.filter((c) => correspond(`${c.titre} ${c.sousTitre ?? ''} ${c.motsCles ?? ''}`, requete));
    // Sans recherche, on met la navigation et les actions en avant.
    if (!requete.trim()) {
      return [...filtrees.filter((c) => c.groupe !== 'Patients'), ...filtrees.filter((c) => c.groupe === 'Patients')].slice(
        0,
        12,
      );
    }
    return filtrees.slice(0, 12);
  }, [commandes, requete]);

  useEffect(() => {
    setIndex(0);
  }, [requete]);

  useEffect(() => {
    liste.current?.querySelector('[data-actif="true"]')?.scrollIntoView({ block: 'nearest' });
  }, [index, resultats]);

  if (!ouverte) return null;

  const groupes = ['Patients', 'Navigation', 'Actions'] as const;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-900/40 p-4 pt-[12vh] backdrop-blur-sm no-print"
      onClick={() => setOuverte(false)}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Palette de commandes"
        className="w-full max-w-lg overflow-hidden rounded-xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-slate-200 px-4">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-slate-400" aria-hidden="true">
            <path d="m21 21-4.3-4.3M17 11a6 6 0 1 1-12 0 6 6 0 0 1 12 0Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          </svg>
          <input
            ref={champ}
            value={requete}
            onChange={(e) => setRequete(e.target.value)}
            placeholder="Rechercher un patient, un écran, une action…"
            aria-label="Rechercher"
            className="w-full bg-transparent py-3.5 text-sm outline-none placeholder:text-slate-400"
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setIndex((i) => Math.min(resultats.length - 1, i + 1));
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setIndex((i) => Math.max(0, i - 1));
              } else if (e.key === 'Enter') {
                e.preventDefault();
                resultats[index]?.executer();
              }
            }}
          />
          <kbd className="rounded border border-slate-300 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500">
            ESC
          </kbd>
        </div>

        <ul ref={liste} className="max-h-80 overflow-y-auto py-1.5">
          {resultats.length === 0 ? (
            <li className="px-4 py-6 text-center text-sm text-slate-400">Aucun résultat.</li>
          ) : (
            groupes.map((groupe) => {
              const dedans = resultats.filter((c) => c.groupe === groupe);
              if (dedans.length === 0) return null;
              return (
                <li key={groupe}>
                  <p className="px-4 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    {groupe}
                  </p>
                  <ul>
                    {dedans.map((c) => {
                      const position = resultats.indexOf(c);
                      const actif = position === index;
                      return (
                        <li key={c.id}>
                          <button
                            type="button"
                            data-actif={actif}
                            onMouseEnter={() => setIndex(position)}
                            onClick={c.executer}
                            className={cx(
                              'flex w-full items-center gap-3 px-4 py-2 text-left text-sm',
                              actif ? 'bg-brand-50 text-brand-900' : 'text-slate-700 hover:bg-slate-50',
                            )}
                          >
                            {c.groupe === 'Patients' ? (
                              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                                {initiales(c.titre.split(' ')[0] ?? '', c.titre.split(' ')[1] ?? '')}
                              </span>
                            ) : null}
                            <span className="min-w-0 flex-1">
                              <span className="block truncate font-medium">{c.titre}</span>
                              {c.sousTitre ? (
                                <span className="block truncate text-xs text-slate-500">{c.sousTitre}</span>
                              ) : null}
                            </span>
                            {actif ? (
                              <kbd className="rounded border border-brand-300 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-brand-700">
                                ⏎
                              </kbd>
                            ) : null}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })
          )}
        </ul>

        <p className="border-t border-slate-200 px-4 py-2 text-[11px] text-slate-400">
          ↑ ↓ pour naviguer · ⏎ pour ouvrir · ⌘K pour fermer
        </p>
      </div>
    </div>,
    document.body,
  );
}
