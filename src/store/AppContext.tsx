import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Acte,
  AppData,
  Cabinet,
  ChartingParo,
  DentEtat,
  Dentition,
  Devis,
  EvenementJournal,
  Facture,
  ImageClinique,
  NoteClinique,
  Odontogramme,
  Ordonnance,
  Paiement,
  Patient,
  RendezVous,
  TypeEvenement,
} from '@/types';
import {
  effacer,
  lireEnveloppe,
  migrer,
  ouvrirEnveloppe,
  sauvegarder,
  sauvegarderChiffre,
} from '@/lib/storage';
import { creerCoffre, ouvrirCoffre, type Coffre, type EnveloppeChiffree } from '@/lib/crypto';
import { donneesDemo, donneesVides } from '@/data/seed';
import { maintenant, uid, arrondi2 } from '@/lib/utils';
import { prochainNumeroFacture, prochainNumeroDevis, statutCalcule } from '@/lib/finance';

/** Élément de journal prêt à être horodaté et signé. */
type BrouillonEvenement = {
  type: TypeEvenement;
  patientId: string | null;
  cible: string;
  resume: string;
  dent?: number | null;
  avant?: unknown;
  apres?: unknown;
};

export type EtatCoffre = 'ouvert' | 'verrouille' | 'sans_protection';

/** Fenêtre de regroupement des écritures, en millisecondes. */
const DELAI_ECRITURE = 400;

export interface AppActions {
  // Patients
  ajouterPatient: (p: Omit<Patient, 'id' | 'creeLe' | 'majLe'>) => Patient;
  majPatient: (id: string, patch: Partial<Patient>) => void;
  supprimerPatient: (id: string) => void;

  // Odontogramme
  odontogramme: (patientId: string) => Odontogramme;
  majDent: (patientId: string, numero: number, patch: Partial<Omit<DentEtat, 'numero'>>) => void;
  reinitialiserDent: (patientId: string, numero: number) => void;
  changerDentition: (patientId: string, dentition: Dentition) => void;

  // Actes
  ajouterActe: (a: Omit<Acte, 'id' | 'creeLe'>) => Acte;
  majActe: (id: string, patch: Partial<Acte>) => void;
  supprimerActe: (id: string) => void;

  // Rendez-vous
  ajouterRdv: (r: Omit<RendezVous, 'id' | 'creeLe'>) => RendezVous;
  majRdv: (id: string, patch: Partial<RendezVous>) => void;
  supprimerRdv: (id: string) => void;

  // Facturation
  ajouterFacture: (f: Omit<Facture, 'id' | 'creeLe' | 'numero'> & { numero?: string }) => Facture;
  majFacture: (id: string, patch: Partial<Facture>) => void;
  supprimerFacture: (id: string) => void;
  ajouterPaiement: (factureId: string, p: Omit<Paiement, 'id'>) => void;
  supprimerPaiement: (factureId: string, paiementId: string) => void;
  facturerActes: (patientId: string, acteIds: string[]) => Facture | null;

  // Notes cliniques
  ajouterNote: (n: Omit<NoteClinique, 'id'>) => NoteClinique;
  supprimerNote: (id: string) => void;

  // Parodontologie
  enregistrerCharting: (c: Omit<ChartingParo, 'id'>) => ChartingParo;
  supprimerCharting: (id: string) => void;

  // Imagerie
  ajouterImage: (i: Omit<ImageClinique, 'id' | 'creeLe'>, id?: string) => ImageClinique;
  majImage: (id: string, patch: Partial<ImageClinique>) => void;
  supprimerImage: (id: string) => void;

  // Devis
  ajouterDevis: (d: Omit<Devis, 'id' | 'creeLe' | 'numero'> & { numero?: string }) => Devis;
  majDevis: (id: string, patch: Partial<Devis>) => void;
  supprimerDevis: (id: string) => void;
  deciderDevis: (id: string, varianteId: string | null) => void;
  basculerDevisEnPlan: (id: string) => number;

  // Ordonnances
  ajouterOrdonnance: (o: Omit<Ordonnance, 'id' | 'creeLe'>) => Ordonnance;
  supprimerOrdonnance: (id: string) => void;

  // Cabinet & données
  majCabinet: (patch: Partial<Cabinet>) => void;
  setPraticienActif: (nom: string) => void;
  remplacerDonnees: (d: AppData) => void;
  chargerDemo: () => void;
  toutEffacer: () => void;

  // Coffre chiffré
  activerProtection: (phrase: string) => Promise<void>;
  desactiverProtection: () => void;
  verrouiller: () => void;
  deverrouiller: (phrase: string) => Promise<void>;
}

interface AppContextValue extends AppActions {
  data: AppData;
  praticienActif: string;
  etatCoffre: EtatCoffre;
  /** Coffre ouvert, pour chiffrer aussi les binaires (imagerie). */
  coffre: Coffre | null;
  /** Enveloppe scellée en attente de déverrouillage. */
  enveloppeVerrouillee: EnveloppeChiffree | null;
}

const AppContext = createContext<AppContextValue | null>(null);

interface EtatDemarrage {
  data: AppData;
  enveloppe: EnveloppeChiffree | null;
}

function etatInitial(): EtatDemarrage {
  const e = lireEnveloppe();
  if (e.etat === 'clair') return { data: e.data, enveloppe: null };
  if (e.etat === 'chiffre') return { data: donneesVides(), enveloppe: e.enveloppe };
  // Premier lancement : un cabinet de démonstration complet, pour que chaque écran serve.
  return { data: donneesDemo(), enveloppe: null };
}

export function AppProvider({ children, initial }: { children: ReactNode; initial?: AppData }) {
  const [demarrage] = useState<EtatDemarrage>(() => (initial ? { data: initial, enveloppe: null } : etatInitial()));
  const [data, setData] = useState<AppData>(demarrage.data);
  const [enveloppeVerrouillee, setEnveloppeVerrouillee] = useState<EnveloppeChiffree | null>(
    demarrage.enveloppe,
  );
  const [coffre, setCoffre] = useState<Coffre | null>(null);
  const [praticienActif, setPraticienActif] = useState<string>(
    () => demarrage.data.cabinet.praticiens[0]?.nom ?? 'Praticien',
  );
  const premierRendu = useRef(true);

  const etatCoffre: EtatCoffre = enveloppeVerrouillee ? 'verrouille' : coffre ? 'ouvert' : 'sans_protection';

  /**
   * Persistance différée.
   *
   * Écrire à chaque frappe sérialisait — et, coffre ouvert, rechiffrait — le
   * dossier entier des dizaines de fois par phrase saisie. Les modifications
   * rapprochées sont regroupées en une seule écriture, et la dernière est
   * forcée dès que l'onglet passe en arrière-plan ou se ferme, pour qu'aucune
   * saisie ne soit perdue.
   */
  const ecrire = useCallback(
    (contenu: AppData) => {
      if (coffre) void sauvegarderChiffre(contenu, coffre);
      else sauvegarder(contenu);
    },
    [coffre],
  );

  const enAttente = useRef<AppData | null>(null);

  useEffect(() => {
    if (enveloppeVerrouillee) return; // rien à écrire tant que le coffre est fermé
    if (premierRendu.current && !initial) {
      premierRendu.current = false;
    }
    enAttente.current = data;
    const minuteur = setTimeout(() => {
      if (enAttente.current) {
        ecrire(enAttente.current);
        enAttente.current = null;
      }
    }, DELAI_ECRITURE);
    return () => clearTimeout(minuteur);
  }, [data, ecrire, enveloppeVerrouillee, initial]);

  // Filet de sécurité : rien ne doit rester en attente quand l'onglet part.
  useEffect(() => {
    const vider = () => {
      if (!enAttente.current) return;
      ecrire(enAttente.current);
      enAttente.current = null;
    };
    const surVisibilite = () => {
      if (document.visibilityState === 'hidden') vider();
    };
    window.addEventListener('pagehide', vider);
    document.addEventListener('visibilitychange', surVisibilite);
    return () => {
      window.removeEventListener('pagehide', vider);
      document.removeEventListener('visibilitychange', surVisibilite);
      vider();
    };
  }, [ecrire]);

  // Verrouillage automatique après inactivité.
  useEffect(() => {
    if (!coffre) return;
    const minutes = data.cabinet.verrouillageMinutes;
    if (!minutes || minutes <= 0) return;
    let minuteur: ReturnType<typeof setTimeout>;
    const replanifier = () => {
      clearTimeout(minuteur);
      minuteur = setTimeout(() => {
        void sauvegarderChiffre(data, coffre).then(() => {
          const e = lireEnveloppe();
          if (e.etat === 'chiffre') {
            setCoffre(null);
            setEnveloppeVerrouillee(e.enveloppe);
            setData(donneesVides());
          }
        });
      }, minutes * 60_000);
    };
    const evenements = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
    evenements.forEach((e) => window.addEventListener(e, replanifier, { passive: true }));
    replanifier();
    return () => {
      clearTimeout(minuteur);
      evenements.forEach((e) => window.removeEventListener(e, replanifier));
    };
  }, [coffre, data]);

  /**
   * Applique une mutation et inscrit l'événement correspondant au journal.
   * L'événement est construit avant l'appel pour que la fonction de mise à
   * jour reste pure.
   */
  const muter = useCallback(
    (maj: (d: AppData) => AppData, brouillon: BrouillonEvenement | null) => {
      const evenement: EvenementJournal | null = brouillon
        ? {
            id: uid('ev'),
            date: maintenant(),
            auteur: praticienActif,
            type: brouillon.type,
            patientId: brouillon.patientId,
            dent: brouillon.dent ?? null,
            cible: brouillon.cible,
            resume: brouillon.resume,
            avant: brouillon.avant ?? null,
            apres: brouillon.apres ?? null,
          }
        : null;
      setData((d) => {
        const suivant = maj(d);
        return evenement ? { ...suivant, journal: [...suivant.journal, evenement] } : suivant;
      });
    },
    [praticienActif],
  );

  const nomPatient = useCallback(
    (id: string | null) => {
      const p = data.patients.find((x) => x.id === id);
      return p ? `${p.prenom} ${p.nom}` : 'Patient';
    },
    [data.patients],
  );

  /* -------------------------------------------------- Patients */

  const ajouterPatient = useCallback(
    (p: Omit<Patient, 'id' | 'creeLe' | 'majLe'>) => {
      const patient: Patient = { ...p, id: uid('pat'), creeLe: maintenant(), majLe: maintenant() };
      muter(
        (d) => ({
          ...d,
          patients: [...d.patients, patient],
          odontogrammes: [...d.odontogrammes, { patientId: patient.id, dentition: 'permanente', dents: [] }],
        }),
        {
          type: 'patient.cree',
          patientId: patient.id,
          cible: `${patient.prenom} ${patient.nom}`,
          resume: 'Création du dossier patient.',
          apres: patient,
        },
      );
      return patient;
    },
    [muter],
  );

  const majPatient = useCallback(
    (id: string, patch: Partial<Patient>) => {
      const avant = data.patients.find((p) => p.id === id);
      muter(
        (d) => ({
          ...d,
          patients: d.patients.map((p) => (p.id === id ? { ...p, ...patch, majLe: maintenant() } : p)),
        }),
        avant
          ? {
              type: 'patient.maj',
              patientId: id,
              cible: `${avant.prenom} ${avant.nom}`,
              resume: `Modification du dossier : ${champsModifies(avant, patch).join(', ') || 'aucun champ'}.`,
              avant,
              apres: { ...avant, ...patch },
            }
          : null,
      );
    },
    [muter, data.patients],
  );

  const supprimerPatient = useCallback(
    (id: string) => {
      const avant = data.patients.find((p) => p.id === id);
      muter(
        (d) => ({
          ...d,
          patients: d.patients.filter((p) => p.id !== id),
          odontogrammes: d.odontogrammes.filter((o) => o.patientId !== id),
          actes: d.actes.filter((a) => a.patientId !== id),
          rendezVous: d.rendezVous.filter((r) => r.patientId !== id),
          factures: d.factures.filter((f) => f.patientId !== id),
          notes: d.notes.filter((n) => n.patientId !== id),
          chartingsParo: d.chartingsParo.filter((c) => c.patientId !== id),
          images: d.images.filter((i) => i.patientId !== id),
          devis: d.devis.filter((x) => x.patientId !== id),
          ordonnances: d.ordonnances.filter((o) => o.patientId !== id),
        }),
        avant
          ? {
              type: 'patient.supprime',
              patientId: id,
              cible: `${avant.prenom} ${avant.nom}`,
              resume: 'Suppression définitive du dossier et de toutes ses données.',
              avant,
            }
          : null,
      );
    },
    [muter, data.patients],
  );

  /* -------------------------------------------------- Odontogramme */

  const odontogramme = useCallback(
    (patientId: string): Odontogramme =>
      data.odontogrammes.find((o) => o.patientId === patientId) ?? {
        patientId,
        dentition: 'permanente',
        dents: [],
      },
    [data.odontogrammes],
  );

  const majDent = useCallback(
    (patientId: string, numero: number, patch: Partial<Omit<DentEtat, 'numero'>>) => {
      const courante = data.odontogrammes
        .find((o) => o.patientId === patientId)
        ?.dents.find((x) => x.numero === numero);
      const suivante: DentEtat = {
        numero,
        etat: patch.etat ?? courante?.etat ?? 'saine',
        faces: patch.faces ?? courante?.faces ?? [],
        note: patch.note ?? courante?.note ?? '',
        majLe: maintenant(),
      };
      muter(
        (d) => {
          const existe = d.odontogrammes.some((o) => o.patientId === patientId);
          const base: Odontogramme[] = existe
            ? d.odontogrammes
            : [...d.odontogrammes, { patientId, dentition: 'permanente', dents: [] }];
          return {
            ...d,
            odontogrammes: base.map((o) => {
              if (o.patientId !== patientId) return o;
              const presente = o.dents.some((x) => x.numero === numero);
              return {
                ...o,
                dents: presente
                  ? o.dents.map((x) => (x.numero === numero ? suivante : x))
                  : [...o.dents, suivante],
              };
            }),
          };
        },
        {
          type: 'dent.maj',
          patientId,
          dent: numero,
          cible: `Dent ${numero}`,
          resume: resumeDent(courante, suivante),
          avant: courante ?? null,
          apres: suivante,
        },
      );
    },
    [muter, data.odontogrammes],
  );

  const reinitialiserDent = useCallback(
    (patientId: string, numero: number) => {
      const courante = data.odontogrammes
        .find((o) => o.patientId === patientId)
        ?.dents.find((x) => x.numero === numero);
      muter(
        (d) => ({
          ...d,
          odontogrammes: d.odontogrammes.map((o) =>
            o.patientId === patientId ? { ...o, dents: o.dents.filter((x) => x.numero !== numero) } : o,
          ),
        }),
        {
          type: 'dent.reset',
          patientId,
          dent: numero,
          cible: `Dent ${numero}`,
          resume: `Dent ${numero} remise à l'état sain.`,
          avant: courante ?? null,
        },
      );
    },
    [muter, data.odontogrammes],
  );

  const changerDentition = useCallback(
    (patientId: string, dentition: Dentition) => {
      muter(
        (d) => {
          const existe = d.odontogrammes.some((o) => o.patientId === patientId);
          if (!existe) {
            return { ...d, odontogrammes: [...d.odontogrammes, { patientId, dentition, dents: [] }] };
          }
          return {
            ...d,
            odontogrammes: d.odontogrammes.map((o) => (o.patientId === patientId ? { ...o, dentition } : o)),
          };
        },
        {
          type: 'dentition.maj',
          patientId,
          cible: 'Schéma dentaire',
          resume: `Passage en dentition ${dentition}.`,
          apres: dentition,
        },
      );
    },
    [muter],
  );

  /* -------------------------------------------------- Actes */

  const ajouterActe = useCallback(
    (a: Omit<Acte, 'id' | 'creeLe'>) => {
      const acte: Acte = { ...a, id: uid('acte'), creeLe: maintenant() };
      muter((d) => ({ ...d, actes: [...d.actes, acte] }), {
        type: 'acte.cree',
        patientId: acte.patientId,
        dent: acte.dents[0] ?? null,
        cible: acte.libelle,
        resume: `Acte « ${acte.libelle} »${acte.dents.length ? ` sur ${acte.dents.join(', ')}` : ''} ajouté au plan.`,
        apres: acte,
      });
      return acte;
    },
    [muter],
  );

  const majActe = useCallback(
    (id: string, patch: Partial<Acte>) => {
      const avant = data.actes.find((a) => a.id === id);
      muter((d) => ({ ...d, actes: d.actes.map((a) => (a.id === id ? { ...a, ...patch } : a)) }), avant
        ? {
            type: 'acte.maj',
            patientId: avant.patientId,
            dent: avant.dents[0] ?? null,
            cible: avant.libelle,
            resume:
              patch.statut && patch.statut !== avant.statut
                ? `Acte « ${avant.libelle} » : statut ${avant.statut} → ${patch.statut}.`
                : `Acte « ${avant.libelle} » modifié.`,
            avant,
            apres: { ...avant, ...patch },
          }
        : null);
    },
    [muter, data.actes],
  );

  const supprimerActe = useCallback(
    (id: string) => {
      const avant = data.actes.find((a) => a.id === id);
      muter((d) => ({ ...d, actes: d.actes.filter((a) => a.id !== id) }), avant
        ? {
            type: 'acte.supprime',
            patientId: avant.patientId,
            dent: avant.dents[0] ?? null,
            cible: avant.libelle,
            resume: `Acte « ${avant.libelle} » retiré du plan de traitement.`,
            avant,
          }
        : null);
    },
    [muter, data.actes],
  );

  /* -------------------------------------------------- Rendez-vous */

  const ajouterRdv = useCallback(
    (r: Omit<RendezVous, 'id' | 'creeLe'>) => {
      const rdv: RendezVous = { ...r, id: uid('rdv'), creeLe: maintenant() };
      muter((d) => ({ ...d, rendezVous: [...d.rendezVous, rdv] }), {
        type: 'rdv.cree',
        patientId: rdv.patientId,
        cible: rdv.motif,
        resume: `Rendez-vous « ${rdv.motif} » planifié le ${new Date(rdv.debut).toLocaleString('fr-FR')}.`,
        apres: rdv,
      });
      return rdv;
    },
    [muter],
  );

  const majRdv = useCallback(
    (id: string, patch: Partial<RendezVous>) => {
      const avant = data.rendezVous.find((r) => r.id === id);
      muter(
        (d) => ({ ...d, rendezVous: d.rendezVous.map((r) => (r.id === id ? { ...r, ...patch } : r)) }),
        avant
          ? {
              type: 'rdv.maj',
              patientId: avant.patientId,
              cible: avant.motif,
              resume:
                patch.statut && patch.statut !== avant.statut
                  ? `Rendez-vous « ${avant.motif} » : ${avant.statut} → ${patch.statut}.`
                  : `Rendez-vous « ${avant.motif} » modifié.`,
              avant,
              apres: { ...avant, ...patch },
            }
          : null,
      );
    },
    [muter, data.rendezVous],
  );

  const supprimerRdv = useCallback(
    (id: string) => {
      const avant = data.rendezVous.find((r) => r.id === id);
      muter(
        (d) => ({
          ...d,
          rendezVous: d.rendezVous.filter((r) => r.id !== id),
          actes: d.actes.map((a) => (a.rdvId === id ? { ...a, rdvId: null } : a)),
        }),
        avant
          ? {
              type: 'rdv.supprime',
              patientId: avant.patientId,
              cible: avant.motif,
              resume: `Rendez-vous « ${avant.motif} » annulé et supprimé.`,
              avant,
            }
          : null,
      );
    },
    [muter, data.rendezVous],
  );

  /* -------------------------------------------------- Facturation */

  const ajouterFacture = useCallback(
    (f: Omit<Facture, 'id' | 'creeLe' | 'numero'> & { numero?: string }) => {
      const facture: Facture = {
        ...f,
        numero: f.numero ?? prochainNumeroFacture(data.factures),
        id: uid('fac'),
        creeLe: maintenant(),
      };
      muter((d) => ({ ...d, factures: [...d.factures, facture] }), {
        type: 'facture.cree',
        patientId: facture.patientId,
        cible: facture.numero,
        resume: `Facture ${facture.numero} émise pour ${nomPatient(facture.patientId)}.`,
        apres: facture,
      });
      return facture;
    },
    [muter, data.factures, nomPatient],
  );

  const majFacture = useCallback(
    (id: string, patch: Partial<Facture>) => {
      const avant = data.factures.find((f) => f.id === id);
      muter(
        (d) => ({
          ...d,
          factures: d.factures.map((f) => {
            if (f.id !== id) return f;
            const maj = { ...f, ...patch };
            return { ...maj, statut: patch.statut ?? statutCalcule(maj) };
          }),
        }),
        avant
          ? {
              type: 'facture.maj',
              patientId: avant.patientId,
              cible: avant.numero,
              resume: `Facture ${avant.numero} modifiée${patch.statut ? ` (statut ${patch.statut})` : ''}.`,
              avant,
              apres: { ...avant, ...patch },
            }
          : null,
      );
    },
    [muter, data.factures],
  );

  const supprimerFacture = useCallback(
    (id: string) => {
      const avant = data.factures.find((f) => f.id === id);
      muter((d) => ({ ...d, factures: d.factures.filter((f) => f.id !== id) }), avant
        ? {
            type: 'facture.supprime',
            patientId: avant.patientId,
            cible: avant.numero,
            resume: `Facture ${avant.numero} supprimée.`,
            avant,
          }
        : null);
    },
    [muter, data.factures],
  );

  const ajouterPaiement = useCallback(
    (factureId: string, p: Omit<Paiement, 'id'>) => {
      const facture = data.factures.find((f) => f.id === factureId);
      const paiement: Paiement = { ...p, id: uid('pay'), montant: arrondi2(p.montant) };
      muter(
        (d) => ({
          ...d,
          factures: d.factures.map((f) => {
            if (f.id !== factureId) return f;
            const maj: Facture = { ...f, paiements: [...f.paiements, paiement] };
            return { ...maj, statut: statutCalcule(maj) };
          }),
        }),
        facture
          ? {
              type: 'paiement.ajoute',
              patientId: facture.patientId,
              cible: facture.numero,
              resume: `Règlement de ${paiement.montant.toFixed(2)} € (${paiement.moyen}) encaissé sur ${facture.numero}.`,
              apres: paiement,
            }
          : null,
      );
    },
    [muter, data.factures],
  );

  const supprimerPaiement = useCallback(
    (factureId: string, paiementId: string) => {
      const facture = data.factures.find((f) => f.id === factureId);
      const paiement = facture?.paiements.find((p) => p.id === paiementId);
      muter(
        (d) => ({
          ...d,
          factures: d.factures.map((f) => {
            if (f.id !== factureId) return f;
            const maj: Facture = { ...f, paiements: f.paiements.filter((p) => p.id !== paiementId) };
            return { ...maj, statut: statutCalcule(maj) };
          }),
        }),
        facture && paiement
          ? {
              type: 'paiement.supprime',
              patientId: facture.patientId,
              cible: facture.numero,
              resume: `Règlement de ${paiement.montant.toFixed(2)} € annulé sur ${facture.numero}.`,
              avant: paiement,
            }
          : null,
      );
    },
    [muter, data.factures],
  );

  const facturerActes = useCallback(
    (patientId: string, acteIds: string[]): Facture | null => {
      const selection = data.actes.filter((a) => acteIds.includes(a.id) && a.patientId === patientId);
      if (selection.length === 0) return null;
      const facture: Facture = {
        id: uid('fac'),
        numero: prochainNumeroFacture(data.factures),
        patientId,
        date: new Date().toISOString().slice(0, 10),
        lignes: selection.map((a) => ({
          acteId: a.id,
          libelle: a.dents.length ? `${a.libelle} — ${a.dents.join(', ')}` : a.libelle,
          quantite: 1,
          prixUnitaire: a.tarif,
        })),
        paiements: [],
        statut: 'emise',
        notes: '',
        creeLe: maintenant(),
      };
      muter((d) => ({ ...d, factures: [...d.factures, facture] }), {
        type: 'facture.cree',
        patientId,
        cible: facture.numero,
        resume: `Facture ${facture.numero} créée à partir de ${selection.length} acte(s) réalisé(s).`,
        apres: facture,
      });
      return facture;
    },
    [muter, data.actes, data.factures],
  );

  /* -------------------------------------------------- Notes */

  const ajouterNote = useCallback(
    (n: Omit<NoteClinique, 'id'>) => {
      const note: NoteClinique = { ...n, id: uid('note') };
      muter((d) => ({ ...d, notes: [...d.notes, note] }), {
        type: 'note.cree',
        patientId: note.patientId,
        dent: note.dents[0] ?? null,
        cible: `Note ${note.categorie}`,
        resume: `Note clinique (${note.categorie}) ajoutée.`,
        apres: note,
      });
      return note;
    },
    [muter],
  );

  const supprimerNote = useCallback(
    (id: string) => {
      const avant = data.notes.find((n) => n.id === id);
      muter((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }), avant
        ? {
            type: 'note.supprime',
            patientId: avant.patientId,
            dent: avant.dents[0] ?? null,
            cible: `Note ${avant.categorie}`,
            resume: 'Note clinique supprimée.',
            avant,
          }
        : null);
    },
    [muter, data.notes],
  );

  /* -------------------------------------------------- Parodontologie */

  const enregistrerCharting = useCallback(
    (c: Omit<ChartingParo, 'id'>) => {
      const charting: ChartingParo = { ...c, id: uid('paro') };
      muter((d) => ({ ...d, chartingsParo: [...d.chartingsParo, charting] }), {
        type: 'perio.enregistre',
        patientId: charting.patientId,
        cible: 'Charting parodontal',
        resume: `Sondage parodontal complet enregistré (${charting.dents.length} dents).`,
        apres: { date: charting.date, dents: charting.dents.length },
      });
      return charting;
    },
    [muter],
  );

  const supprimerCharting = useCallback(
    (id: string) => {
      const avant = data.chartingsParo.find((c) => c.id === id);
      muter((d) => ({ ...d, chartingsParo: d.chartingsParo.filter((c) => c.id !== id) }), avant
        ? {
            type: 'perio.enregistre',
            patientId: avant.patientId,
            cible: 'Charting parodontal',
            resume: 'Charting parodontal supprimé.',
            avant: { date: avant.date },
          }
        : null);
    },
    [muter, data.chartingsParo],
  );

  /* -------------------------------------------------- Imagerie */

  const ajouterImage = useCallback(
    (i: Omit<ImageClinique, 'id' | 'creeLe'>, id?: string) => {
      const image: ImageClinique = { ...i, id: id ?? uid('img'), creeLe: maintenant() };
      muter((d) => ({ ...d, images: [...d.images, image] }), {
        type: 'image.ajoutee',
        patientId: image.patientId,
        dent: image.dents[0] ?? null,
        cible: image.libelle,
        resume: `Image « ${image.libelle} » (${image.type}) ajoutée au dossier.`,
        apres: { id: image.id, type: image.type, dents: image.dents },
      });
      return image;
    },
    [muter],
  );

  const majImage = useCallback(
    (id: string, patch: Partial<ImageClinique>) => {
      muter((d) => ({ ...d, images: d.images.map((i) => (i.id === id ? { ...i, ...patch } : i)) }), null);
    },
    [muter],
  );

  const supprimerImage = useCallback(
    (id: string) => {
      const avant = data.images.find((i) => i.id === id);
      muter((d) => ({ ...d, images: d.images.filter((i) => i.id !== id) }), avant
        ? {
            type: 'image.supprimee',
            patientId: avant.patientId,
            dent: avant.dents[0] ?? null,
            cible: avant.libelle,
            resume: `Image « ${avant.libelle} » supprimée.`,
            avant: { id: avant.id, type: avant.type },
          }
        : null);
    },
    [muter, data.images],
  );

  /* -------------------------------------------------- Devis */

  const ajouterDevis = useCallback(
    (x: Omit<Devis, 'id' | 'creeLe' | 'numero'> & { numero?: string }) => {
      const devis: Devis = {
        ...x,
        numero: x.numero ?? prochainNumeroDevis(data.devis),
        id: uid('dev'),
        creeLe: maintenant(),
      };
      muter((d) => ({ ...d, devis: [...d.devis, devis] }), {
        type: 'devis.cree',
        patientId: devis.patientId,
        cible: devis.numero,
        resume: `Devis ${devis.numero} créé avec ${devis.variantes.length} option(s) thérapeutique(s).`,
        apres: devis,
      });
      return devis;
    },
    [muter, data.devis],
  );

  const majDevis = useCallback(
    (id: string, patch: Partial<Devis>) => {
      const avant = data.devis.find((x) => x.id === id);
      muter((d) => ({ ...d, devis: d.devis.map((x) => (x.id === id ? { ...x, ...patch } : x)) }), avant
        ? {
            type: 'devis.maj',
            patientId: avant.patientId,
            cible: avant.numero,
            resume: `Devis ${avant.numero} modifié.`,
            avant,
            apres: { ...avant, ...patch },
          }
        : null);
    },
    [muter, data.devis],
  );

  const supprimerDevis = useCallback(
    (id: string) => {
      const avant = data.devis.find((x) => x.id === id);
      muter((d) => ({ ...d, devis: d.devis.filter((x) => x.id !== id) }), avant
        ? {
            type: 'devis.maj',
            patientId: avant.patientId,
            cible: avant.numero,
            resume: `Devis ${avant.numero} supprimé.`,
            avant,
          }
        : null);
    },
    [muter, data.devis],
  );

  const deciderDevis = useCallback(
    (id: string, varianteId: string | null) => {
      const avant = data.devis.find((x) => x.id === id);
      const variante = avant?.variantes.find((v) => v.id === varianteId);
      muter(
        (d) => ({
          ...d,
          devis: d.devis.map((x) =>
            x.id === id
              ? {
                  ...x,
                  varianteAcceptee: varianteId,
                  dateDecision: new Date().toISOString().slice(0, 10),
                  statut: varianteId ? 'accepte' : 'refuse',
                }
              : x,
          ),
        }),
        avant
          ? {
              type: 'devis.decide',
              patientId: avant.patientId,
              cible: avant.numero,
              resume: varianteId
                ? `Devis ${avant.numero} accepté — option « ${variante?.nom ?? varianteId} ».`
                : `Devis ${avant.numero} refusé par le patient.`,
              avant: { statut: avant.statut },
              apres: { statut: varianteId ? 'accepte' : 'refuse', variante: varianteId },
            }
          : null,
      );
    },
    [muter, data.devis],
  );

  /** Transforme l'option acceptée d'un devis en actes du plan de traitement. */
  const basculerDevisEnPlan = useCallback(
    (id: string): number => {
      const devis = data.devis.find((x) => x.id === id);
      const variante = devis?.variantes.find((v) => v.id === devis.varianteAcceptee);
      if (!devis || !variante) return 0;
      const nouveaux: Acte[] = variante.lignes.map((l, i) => ({
        id: uid('acte'),
        patientId: devis.patientId,
        dents: l.dents,
        faces: [],
        codeActe: l.codeActe,
        libelle: l.libelle,
        statut: 'planifie',
        tarif: l.tarif,
        baseRemboursement: l.baseRemboursement,
        seance: i + 1,
        praticien: devis.praticien,
        datePrevue: new Date().toISOString().slice(0, 10),
        dateRealisation: null,
        rdvId: null,
        notes: `Issu du devis ${devis.numero} — option « ${variante.nom} ».`,
        creeLe: maintenant(),
      }));
      muter((d) => ({ ...d, actes: [...d.actes, ...nouveaux] }), {
        type: 'acte.cree',
        patientId: devis.patientId,
        cible: devis.numero,
        resume: `${nouveaux.length} acte(s) ajoutés au plan depuis le devis ${devis.numero}.`,
        apres: { actes: nouveaux.length },
      });
      return nouveaux.length;
    },
    [muter, data.devis],
  );

  /* -------------------------------------------------- Ordonnances */

  const ajouterOrdonnance = useCallback(
    (o: Omit<Ordonnance, 'id' | 'creeLe'>) => {
      const ordonnance: Ordonnance = { ...o, id: uid('ord'), creeLe: maintenant() };
      muter((d) => ({ ...d, ordonnances: [...d.ordonnances, ordonnance] }), {
        type: 'ordonnance.cree',
        patientId: ordonnance.patientId,
        cible: 'Ordonnance',
        resume: `Ordonnance de ${ordonnance.lignes.length} ligne(s) délivrée.`,
        apres: ordonnance,
      });
      return ordonnance;
    },
    [muter],
  );

  const supprimerOrdonnance = useCallback(
    (id: string) => {
      muter((d) => ({ ...d, ordonnances: d.ordonnances.filter((o) => o.id !== id) }), null);
    },
    [muter],
  );

  /* -------------------------------------------------- Cabinet & données */

  const majCabinet = useCallback(
    (patch: Partial<Cabinet>) => {
      muter((d) => ({ ...d, cabinet: { ...d.cabinet, ...patch } }), null);
    },
    [muter],
  );

  const remplacerDonnees = useCallback(
    (d: AppData) => {
      const migre = migrer(d);
      setData({
        ...migre,
        journal: [
          ...migre.journal,
          {
            id: uid('ev'),
            date: maintenant(),
            auteur: praticienActif,
            type: 'donnees.importees',
            patientId: null,
            dent: null,
            cible: 'Sauvegarde',
            resume: `Import d'une sauvegarde : ${migre.patients.length} patients restaurés.`,
            avant: null,
            apres: null,
          },
        ],
      });
    },
    [praticienActif],
  );

  const chargerDemo = useCallback(() => setData(donneesDemo()), []);

  const toutEffacer = useCallback(() => {
    effacer();
    setCoffre(null);
    setEnveloppeVerrouillee(null);
    setData({
      ...donneesVides(),
      journal: [
        {
          id: uid('ev'),
          date: maintenant(),
          auteur: praticienActif,
          type: 'donnees.effacees',
          patientId: null,
          dent: null,
          cible: 'Base complète',
          resume: 'Effacement de toutes les données du cabinet.',
          avant: null,
          apres: null,
        },
      ],
    });
  }, [praticienActif]);

  /* -------------------------------------------------- Coffre */

  const activerProtection = useCallback(
    async (phrase: string) => {
      const nouveau = await creerCoffre(phrase);
      await sauvegarderChiffre(data, nouveau);
      setCoffre(nouveau);
    },
    [data],
  );

  const desactiverProtection = useCallback(() => {
    setCoffre(null);
    sauvegarder(data);
  }, [data]);

  const verrouiller = useCallback(() => {
    if (!coffre) return;
    void sauvegarderChiffre(data, coffre).then(() => {
      const e = lireEnveloppe();
      if (e.etat === 'chiffre') {
        setCoffre(null);
        setEnveloppeVerrouillee(e.enveloppe);
        setData(donneesVides());
      }
    });
  }, [coffre, data]);

  const deverrouiller = useCallback(
    async (phrase: string) => {
      if (!enveloppeVerrouillee) return;
      const ouvert = await ouvrirCoffre(phrase, enveloppeVerrouillee.sel);
      const contenu = await ouvrirEnveloppe(enveloppeVerrouillee, ouvert);
      setData(contenu);
      setCoffre(ouvert);
      setEnveloppeVerrouillee(null);
      setPraticienActif(contenu.cabinet.praticiens[0]?.nom ?? 'Praticien');
    },
    [enveloppeVerrouillee],
  );

  const valeur = useMemo<AppContextValue>(
    () => ({
      data,
      praticienActif,
      etatCoffre,
      coffre,
      enveloppeVerrouillee,
      ajouterPatient,
      majPatient,
      supprimerPatient,
      odontogramme,
      majDent,
      reinitialiserDent,
      changerDentition,
      ajouterActe,
      majActe,
      supprimerActe,
      ajouterRdv,
      majRdv,
      supprimerRdv,
      ajouterFacture,
      majFacture,
      supprimerFacture,
      ajouterPaiement,
      supprimerPaiement,
      facturerActes,
      ajouterNote,
      supprimerNote,
      enregistrerCharting,
      supprimerCharting,
      ajouterImage,
      majImage,
      supprimerImage,
      ajouterDevis,
      majDevis,
      supprimerDevis,
      deciderDevis,
      basculerDevisEnPlan,
      ajouterOrdonnance,
      supprimerOrdonnance,
      majCabinet,
      setPraticienActif,
      remplacerDonnees,
      chargerDemo,
      toutEffacer,
      activerProtection,
      desactiverProtection,
      verrouiller,
      deverrouiller,
    }),
    [
      data,
      praticienActif,
      etatCoffre,
      coffre,
      enveloppeVerrouillee,
      ajouterPatient,
      majPatient,
      supprimerPatient,
      odontogramme,
      majDent,
      reinitialiserDent,
      changerDentition,
      ajouterActe,
      majActe,
      supprimerActe,
      ajouterRdv,
      majRdv,
      supprimerRdv,
      ajouterFacture,
      majFacture,
      supprimerFacture,
      ajouterPaiement,
      supprimerPaiement,
      facturerActes,
      ajouterNote,
      supprimerNote,
      enregistrerCharting,
      supprimerCharting,
      ajouterImage,
      majImage,
      supprimerImage,
      ajouterDevis,
      majDevis,
      supprimerDevis,
      deciderDevis,
      basculerDevisEnPlan,
      ajouterOrdonnance,
      supprimerOrdonnance,
      majCabinet,
      remplacerDonnees,
      chargerDemo,
      toutEffacer,
      activerProtection,
      desactiverProtection,
      verrouiller,
      deverrouiller,
    ],
  );

  return <AppContext.Provider value={valeur}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp doit être utilisé à l’intérieur de <AppProvider>.');
  return ctx;
}

/** Convenience selector for a single patient. */
export function usePatient(id: string | undefined): Patient | undefined {
  const { data } = useApp();
  return data.patients.find((p) => p.id === id);
}

/* -------------------------------------------------- Helpers de journalisation */

const LIBELLES_CHAMPS: Partial<Record<keyof Patient, string>> = {
  nom: 'nom',
  prenom: 'prénom',
  dateNaissance: 'date de naissance',
  telephone: 'téléphone',
  email: 'e-mail',
  adresse: 'adresse',
  mutuelle: 'mutuelle',
  allergies: 'allergies',
  antecedents: 'antécédents',
  alertes: 'alertes',
  facteursRisque: 'facteurs de risque',
  rappelMois: 'intervalle de rappel',
  actif: 'statut du dossier',
};

function champsModifies(avant: Patient, patch: Partial<Patient>): string[] {
  return (Object.keys(patch) as Array<keyof Patient>)
    .filter((k) => JSON.stringify(avant[k]) !== JSON.stringify(patch[k]))
    .map((k) => LIBELLES_CHAMPS[k] ?? String(k));
}

function resumeDent(avant: DentEtat | undefined, apres: DentEtat): string {
  const faces = apres.faces.length ? ` (faces ${apres.faces.join('/')})` : '';
  if (!avant) return `Dent ${apres.numero} : ${apres.etat}${faces}.`;
  if (avant.etat !== apres.etat) return `Dent ${apres.numero} : ${avant.etat} → ${apres.etat}${faces}.`;
  if (JSON.stringify(avant.faces) !== JSON.stringify(apres.faces))
    return `Dent ${apres.numero} : faces mises à jour${faces}.`;
  if (avant.note !== apres.note) return `Dent ${apres.numero} : note clinique modifiée.`;
  return `Dent ${apres.numero} mise à jour.`;
}
