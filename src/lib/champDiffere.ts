import { useEffect, useRef, useState } from 'react';

/**
 * Champ de saisie dont la valeur n'est portée au dossier qu'une fois la
 * frappe terminée.
 *
 * Écrire à chaque caractère inscrivait un événement par frappe au journal
 * clinique : une note de trois lignes y laissait trente-sept lignes
 * d'historique, et autant de réécritures du dossier. Le brouillon reste local
 * et n'est engagé qu'après une pause de frappe, ou à la sortie du champ.
 */
export function useChampDiffere(
  valeur: string,
  engager: (v: string) => void,
  delai = 600,
): {
  brouillon: string;
  setBrouillon: (v: string) => void;
  /** À brancher sur onBlur : engage immédiatement sans attendre la pause. */
  engagerMaintenant: () => void;
} {
  const [brouillon, setBrouillon] = useState(valeur);
  const engagerRef = useRef(engager);
  engagerRef.current = engager;

  // La valeur du dossier a changé ailleurs (autre dent, autre patient).
  useEffect(() => {
    setBrouillon(valeur);
  }, [valeur]);

  useEffect(() => {
    if (brouillon === valeur) return;
    const minuteur = setTimeout(() => engagerRef.current(brouillon), delai);
    return () => clearTimeout(minuteur);
  }, [brouillon, valeur, delai]);

  return {
    brouillon,
    setBrouillon,
    engagerMaintenant: () => {
      if (brouillon !== valeur) engagerRef.current(brouillon);
    },
  };
}
