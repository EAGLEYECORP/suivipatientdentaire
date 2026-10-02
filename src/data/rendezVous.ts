import type { StatutRdv } from '@/types';
import type { TonBadge } from '@/components/ui/Badge';

/**
 * Présentation des statuts de rendez-vous, partagée par l'agenda, le tableau
 * de bord et la fiche patient. Isolée de la page Agenda pour que celle-ci
 * reste chargeable à la demande.
 */
export const STATUT_RDV_META: Record<StatutRdv, { libelle: string; ton: TonBadge; barre: string }> = {
  prevu: { libelle: 'Prévu', ton: 'neutre', barre: 'border-l-slate-400 bg-slate-50' },
  confirme: { libelle: 'Confirmé', ton: 'info', barre: 'border-l-brand-500 bg-brand-50' },
  en_salle: { libelle: 'En salle', ton: 'violet', barre: 'border-l-violet-500 bg-violet-50' },
  termine: { libelle: 'Terminé', ton: 'succes', barre: 'border-l-emerald-500 bg-emerald-50' },
  annule: { libelle: 'Annulé', ton: 'danger', barre: 'border-l-red-400 bg-red-50' },
  absent: { libelle: 'Absent', ton: 'alerte', barre: 'border-l-amber-500 bg-amber-50' },
};
