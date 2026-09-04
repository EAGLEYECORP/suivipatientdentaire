import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import type {
  Acte,
  AppData,
  Cabinet,
  DentEtat,
  Dentition,
  Facture,
  NoteClinique,
  Odontogramme,
  Paiement,
  Patient,
  RendezVous,
} from '@/types';
import { charger, sauvegarder, effacer } from '@/lib/storage';
import { donneesDemo, donneesVides } from '@/data/seed';
import { maintenant, uid, arrondi2 } from '@/lib/utils';
import { prochainNumeroFacture, statutCalcule } from '@/lib/finance';

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

  // Cabinet & données
  majCabinet: (patch: Partial<Cabinet>) => void;
  remplacerDonnees: (d: AppData) => void;
  chargerDemo: () => void;
  toutEffacer: () => void;
}

interface AppContextValue extends AppActions {
  data: AppData;
}

const AppContext = createContext<AppContextValue | null>(null);

function etatInitial(): AppData {
  const stocke = charger();
  if (stocke) return stocke;
  // First launch: ship a populated practice so every screen is immediately usable.
  return donneesDemo();
}

export function AppProvider({ children, initial }: { children: ReactNode; initial?: AppData }) {
  const [data, setData] = useState<AppData>(() => initial ?? etatInitial());

  useEffect(() => {
    sauvegarder(data);
  }, [data]);

  const ajouterPatient = useCallback((p: Omit<Patient, 'id' | 'creeLe' | 'majLe'>) => {
    const patient: Patient = { ...p, id: uid('pat'), creeLe: maintenant(), majLe: maintenant() };
    setData((d) => ({
      ...d,
      patients: [...d.patients, patient],
      odontogrammes: [
        ...d.odontogrammes,
        { patientId: patient.id, dentition: 'permanente', dents: [] },
      ],
    }));
    return patient;
  }, []);

  const majPatient = useCallback((id: string, patch: Partial<Patient>) => {
    setData((d) => ({
      ...d,
      patients: d.patients.map((p) => (p.id === id ? { ...p, ...patch, majLe: maintenant() } : p)),
    }));
  }, []);

  const supprimerPatient = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      patients: d.patients.filter((p) => p.id !== id),
      odontogrammes: d.odontogrammes.filter((o) => o.patientId !== id),
      actes: d.actes.filter((a) => a.patientId !== id),
      rendezVous: d.rendezVous.filter((r) => r.patientId !== id),
      factures: d.factures.filter((f) => f.patientId !== id),
      notes: d.notes.filter((n) => n.patientId !== id),
    }));
  }, []);

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
      setData((d) => {
        const existe = d.odontogrammes.some((o) => o.patientId === patientId);
        const base: Odontogramme[] = existe
          ? d.odontogrammes
          : [...d.odontogrammes, { patientId, dentition: 'permanente', dents: [] }];
        return {
          ...d,
          odontogrammes: base.map((o) => {
            if (o.patientId !== patientId) return o;
            const courante = o.dents.find((x) => x.numero === numero);
            const suivante: DentEtat = {
              numero,
              etat: patch.etat ?? courante?.etat ?? 'saine',
              faces: patch.faces ?? courante?.faces ?? [],
              note: patch.note ?? courante?.note ?? '',
              majLe: maintenant(),
            };
            return {
              ...o,
              dents: courante
                ? o.dents.map((x) => (x.numero === numero ? suivante : x))
                : [...o.dents, suivante],
            };
          }),
        };
      });
    },
    [],
  );

  const reinitialiserDent = useCallback((patientId: string, numero: number) => {
    setData((d) => ({
      ...d,
      odontogrammes: d.odontogrammes.map((o) =>
        o.patientId === patientId ? { ...o, dents: o.dents.filter((x) => x.numero !== numero) } : o,
      ),
    }));
  }, []);

  const changerDentition = useCallback((patientId: string, dentition: Dentition) => {
    setData((d) => {
      const existe = d.odontogrammes.some((o) => o.patientId === patientId);
      if (!existe) {
        return { ...d, odontogrammes: [...d.odontogrammes, { patientId, dentition, dents: [] }] };
      }
      return {
        ...d,
        odontogrammes: d.odontogrammes.map((o) => (o.patientId === patientId ? { ...o, dentition } : o)),
      };
    });
  }, []);

  const ajouterActe = useCallback((a: Omit<Acte, 'id' | 'creeLe'>) => {
    const acte: Acte = { ...a, id: uid('acte'), creeLe: maintenant() };
    setData((d) => ({ ...d, actes: [...d.actes, acte] }));
    return acte;
  }, []);

  const majActe = useCallback((id: string, patch: Partial<Acte>) => {
    setData((d) => ({ ...d, actes: d.actes.map((a) => (a.id === id ? { ...a, ...patch } : a)) }));
  }, []);

  const supprimerActe = useCallback((id: string) => {
    setData((d) => ({ ...d, actes: d.actes.filter((a) => a.id !== id) }));
  }, []);

  const ajouterRdv = useCallback((r: Omit<RendezVous, 'id' | 'creeLe'>) => {
    const rdv: RendezVous = { ...r, id: uid('rdv'), creeLe: maintenant() };
    setData((d) => ({ ...d, rendezVous: [...d.rendezVous, rdv] }));
    return rdv;
  }, []);

  const majRdv = useCallback((id: string, patch: Partial<RendezVous>) => {
    setData((d) => ({
      ...d,
      rendezVous: d.rendezVous.map((r) => (r.id === id ? { ...r, ...patch } : r)),
    }));
  }, []);

  const supprimerRdv = useCallback((id: string) => {
    setData((d) => ({
      ...d,
      rendezVous: d.rendezVous.filter((r) => r.id !== id),
      actes: d.actes.map((a) => (a.rdvId === id ? { ...a, rdvId: null } : a)),
    }));
  }, []);

  const ajouterFacture = useCallback(
    (f: Omit<Facture, 'id' | 'creeLe' | 'numero'> & { numero?: string }) => {
      const facture: Facture = {
        ...f,
        numero: f.numero ?? prochainNumeroFacture(data.factures),
        id: uid('fac'),
        creeLe: maintenant(),
      };
      setData((d) => ({ ...d, factures: [...d.factures, facture] }));
      return facture;
    },
    [data.factures],
  );

  const majFacture = useCallback((id: string, patch: Partial<Facture>) => {
    setData((d) => ({
      ...d,
      factures: d.factures.map((f) => {
        if (f.id !== id) return f;
        const maj = { ...f, ...patch };
        return { ...maj, statut: patch.statut ?? statutCalcule(maj) };
      }),
    }));
  }, []);

  const supprimerFacture = useCallback((id: string) => {
    setData((d) => ({ ...d, factures: d.factures.filter((f) => f.id !== id) }));
  }, []);

  const ajouterPaiement = useCallback((factureId: string, p: Omit<Paiement, 'id'>) => {
    setData((d) => ({
      ...d,
      factures: d.factures.map((f) => {
        if (f.id !== factureId) return f;
        const maj: Facture = {
          ...f,
          paiements: [...f.paiements, { ...p, id: uid('pay'), montant: arrondi2(p.montant) }],
        };
        return { ...maj, statut: statutCalcule(maj) };
      }),
    }));
  }, []);

  const supprimerPaiement = useCallback((factureId: string, paiementId: string) => {
    setData((d) => ({
      ...d,
      factures: d.factures.map((f) => {
        if (f.id !== factureId) return f;
        const maj: Facture = { ...f, paiements: f.paiements.filter((p) => p.id !== paiementId) };
        return { ...maj, statut: statutCalcule(maj) };
      }),
    }));
  }, []);

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
      setData((d) => ({ ...d, factures: [...d.factures, facture] }));
      return facture;
    },
    [data.actes, data.factures],
  );

  const ajouterNote = useCallback((n: Omit<NoteClinique, 'id'>) => {
    const note: NoteClinique = { ...n, id: uid('note') };
    setData((d) => ({ ...d, notes: [...d.notes, note] }));
    return note;
  }, []);

  const supprimerNote = useCallback((id: string) => {
    setData((d) => ({ ...d, notes: d.notes.filter((n) => n.id !== id) }));
  }, []);

  const majCabinet = useCallback((patch: Partial<Cabinet>) => {
    setData((d) => ({ ...d, cabinet: { ...d.cabinet, ...patch } }));
  }, []);

  const remplacerDonnees = useCallback((d: AppData) => setData(d), []);
  const chargerDemo = useCallback(() => setData(donneesDemo()), []);
  const toutEffacer = useCallback(() => {
    effacer();
    setData(donneesVides());
  }, []);

  const valeur = useMemo<AppContextValue>(
    () => ({
      data,
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
      majCabinet,
      remplacerDonnees,
      chargerDemo,
      toutEffacer,
    }),
    [
      data,
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
      majCabinet,
      remplacerDonnees,
      chargerDemo,
      toutEffacer,
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
