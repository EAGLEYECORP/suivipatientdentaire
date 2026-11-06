/**
 * Dictée vocale via l’API Web Speech (Chrome, Edge, Safari récents).
 * Fonctionne hors ligne une fois le modèle de langue chargé par le navigateur.
 * Retourne null si l’API n’est pas disponible.
 *
 * Types locaux : l’API Web Speech n’est pas toujours présente dans les
 * définitions DOM de TypeScript selon la version / la config `types`.
 */

export type EtatDictée = 'indisponible' | 'arretee' | 'ecoute' | 'erreur';

export interface ControleDictée {
  etat: EtatDictée;
  demarrer: () => void;
  arreter: () => void;
  /** Dernier texte partiel reconnu (mis à jour en direct). */
  partiel: string;
  /** Texte final consolidé depuis le début de la session. */
  final: string;
}

/** Sous-ensemble minimal de l’interface SpeechRecognition (Web Speech API). */
interface ReconnaissanceVocale {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  onresult: ((event: ResultatReconnaissance) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
}

interface ResultatReconnaissance {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    0: { transcript: string };
  }>;
}

type ConstructeurReconnaissance = new () => ReconnaissanceVocale;

function obtenirConstructeur(): ConstructeurReconnaissance | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: ConstructeurReconnaissance;
    webkitSpeechRecognition?: ConstructeurReconnaissance;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function estDictéeDisponible(): boolean {
  return obtenirConstructeur() !== null;
}

/**
 * Crée un contrôleur de dictée. Le callback `onFinal` est appelé à chaque
 * résultat définitif ; `onPartiel` pour les hypothèses en cours.
 */
export function creerDictée(options: {
  langue?: string;
  onFinal?: (texte: string) => void;
  onPartiel?: (texte: string) => void;
  onEtat?: (etat: EtatDictée) => void;
}): ControleDictée {
  const Ctor = obtenirConstructeur();
  if (!Ctor) {
    return {
      etat: 'indisponible',
      demarrer: () => {},
      arreter: () => {},
      partiel: '',
      final: '',
    };
  }

  let recognition: ReconnaissanceVocale | null = null;
  let etat: EtatDictée = 'arretee';
  let partiel = '';
  let final = '';

  const notifier = () => options.onEtat?.(etat);

  const demarrer = () => {
    if (etat === 'ecoute') return;
    recognition = new Ctor();
    recognition.lang = options.langue ?? 'fr-FR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: ResultatReconnaissance) => {
      let interim = '';
      let confirmed = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const res = event.results[i];
        if (res.isFinal) confirmed += res[0].transcript;
        else interim += res[0].transcript;
      }
      if (confirmed) {
        final = (final + ' ' + confirmed).trim();
        options.onFinal?.(final);
      }
      partiel = interim;
      options.onPartiel?.(interim);
    };

    recognition.onerror = () => {
      etat = 'erreur';
      notifier();
    };

    recognition.onend = () => {
      // Redémarrage automatique si on était encore en écoute (timeout navigateur).
      if (etat === 'ecoute') {
        try {
          recognition?.start();
        } catch {
          etat = 'arretee';
          notifier();
        }
      } else {
        etat = 'arretee';
        notifier();
      }
    };

    try {
      recognition.start();
      etat = 'ecoute';
      notifier();
    } catch {
      etat = 'erreur';
      notifier();
    }
  };

  const arreter = () => {
    etat = 'arretee';
    try {
      recognition?.stop();
    } catch {
      /* ignore */
    }
    recognition = null;
    notifier();
  };

  return {
    get etat() {
      return etat;
    },
    demarrer,
    arreter,
    get partiel() {
      return partiel;
    },
    get final() {
      return final;
    },
  };
}
