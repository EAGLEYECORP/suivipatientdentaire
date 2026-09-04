import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

export function ConfirmDialog({
  ouvert,
  titre,
  message,
  libelleConfirmer = 'Supprimer',
  onConfirmer,
  onAnnuler,
}: {
  ouvert: boolean;
  titre: string;
  message: string;
  libelleConfirmer?: string;
  onConfirmer: () => void;
  onAnnuler: () => void;
}) {
  return (
    <Modal
      ouvert={ouvert}
      titre={titre}
      onFermer={onAnnuler}
      largeur="sm"
      pied={
        <>
          <Button variante="secondaire" onClick={onAnnuler}>
            Annuler
          </Button>
          <Button variante="danger" onClick={onConfirmer}>
            {libelleConfirmer}
          </Button>
        </>
      }
    >
      <p className="text-sm text-slate-600">{message}</p>
    </Modal>
  );
}
