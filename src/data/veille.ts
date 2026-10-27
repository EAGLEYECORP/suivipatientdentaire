/**
 * Veille professionnelle embarquée.
 *
 * L'application ne passe aucun appel réseau : ce fil est livré avec le
 * logiciel et daté, il ne se rafraîchit pas tout seul. C'est un choix, pas
 * une limite subie. Un cabinet qui refuse qu'un logiciel clinique sorte sur
 * Internet ne peut pas avoir un fil d'actualité qui interroge un serveur.
 *
 * Trois règles tenues pour chaque entrée :
 *
 *   1. **Une source vérifiable**, ou l'entrée ne figure pas ici. Les
 *      affirmations de blogs commerciaux ont été écartées.
 *   2. **Un niveau de maturité**, parce que « des chercheurs ont fait
 *      repousser une dent chez le furet » et « vous pouvez le proposer
 *      demain » ne sont pas la même information.
 *   3. **Une réserve**, toujours. Ce qu'on ne sait pas encore fait partie de
 *      l'information. Une veille qui n'énonce que des promesses est une
 *      brochure.
 */

export type CategorieVeille = 'ia' | 'regeneration' | 'reglementation' | 'materiaux';

export type MaturiteVeille = 'disponible' | 'essai' | 'recherche' | 'cadre';

export interface SourceVeille {
  titre: string;
  url: string;
}

export interface EntreeVeille {
  id: string;
  /** Mois de l'information, au format AAAA-MM. Tri lexicographique. */
  date: string;
  titre: string;
  categorie: CategorieVeille;
  maturite: MaturiteVeille;
  resume: string;
  /** Ce que cela change au fauteuil, ou rien si cela ne change rien encore. */
  consequence: string;
  /** Ce qui reste incertain. Jamais vide. */
  reserve: string;
  sources: SourceVeille[];
}

/** Date de clôture du fil, affichée pour que son âge soit visible. */
export const DATE_VEILLE = '2026-10';

export const LIBELLE_CATEGORIE: Record<CategorieVeille, string> = {
  ia: 'Intelligence artificielle',
  regeneration: 'Régénération',
  reglementation: 'Cadre et remboursement',
  materiaux: 'Matériaux et procédés',
};

export const LIBELLE_MATURITE: Record<MaturiteVeille, string> = {
  disponible: 'Disponible',
  essai: 'En essai clinique',
  recherche: 'Recherche',
  cadre: 'Cadre en vigueur',
};

/** Ce que chaque niveau autorise réellement, écrit sans ambiguïté. */
export const EXPLICATION_MATURITE: Record<MaturiteVeille, string> = {
  disponible: 'Produit autorisé et commercialisé, au moins sur un marché.',
  essai: 'Évalué chez l’humain. Rien n’est autorisé ni proposable au patient.',
  recherche: 'Travaux précliniques. Aucune application au fauteuil.',
  cadre: 'Règle ou tarif en vigueur, qui s’applique à vos actes aujourd’hui.',
};

export const VEILLE: EntreeVeille[] = [
  {
    id: 'pearl-panoramique-2025',
    date: '2025-12',
    categorie: 'ia',
    maturite: 'disponible',
    titre: 'Lecture assistée des panoramiques autorisée par la FDA',
    resume:
      'Pearl a obtenu une autorisation 510(k) pour la détection assistée sur radiographies panoramiques : caries suspectées, radioclartés périapicales et dents de sagesse incluses. Le dossier s’appuie sur une étude de performance autonome et sur un essai multi-lecteurs multi-cas entièrement croisé.',
    consequence:
      'La lecture assistée de la panoramique quitte la démonstration commerciale pour entrer dans le cadre réglementaire américain. Jusque-là, les autorisations portaient surtout sur le rétro-alvéolaire et le bitewing.',
    reserve:
      'C’est une autorisation américaine. Aucune information de marquage CE n’a été trouvée pour ces produits, et c’est le marquage CE qui conditionne l’usage en France comme au Maroc. À vérifier auprès du fabricant avant tout achat.',
    sources: [
      {
        titre: 'Pearl, communiqué sur l’autorisation FDA pour la panoramique',
        url: 'https://www.hellopearl.com/press-release/pearl-expands-dental-ai-capabilities-with-fda-clearance-for-panoramic-x-rays',
      },
      {
        titre: 'Compendium, autorisation 510(k) pour la détection sur panoramique',
        url: 'https://compendiumlive.com/news/?newsID=104373',
      },
    ],
  },
  {
    id: 'overjet-autorisations',
    date: '2023-06',
    categorie: 'ia',
    maturite: 'disponible',
    titre: 'Carie, niveau osseux et périapical : trois familles d’outils autorisées',
    resume:
      'Overjet détient des autorisations FDA pour la détection de carie (K212519, K222746), la mesure du niveau osseux (K210187) et la détection des radioclartés périapicales (K231678). Denti.AI Detect est autorisé depuis 2023 pour la radiographie intra-orale (K230144), et Pearl Second Opinion depuis mars 2022 sur bitewing et rétro-alvéolaire, chez le patient de 12 ans et plus.',
    consequence:
      'Trois tâches distinctes, trois autorisations distinctes. Un produit autorisé pour la carie ne l’est pas pour le niveau osseux : vérifiez le périmètre exact avant de vous appuyer dessus.',
    reserve:
      'Les bornes d’âge et les types de clichés figurant dans les autorisations sont contraignants. Un outil autorisé chez l’adulte de 12 ans et plus n’a pas été évalué chez l’enfant plus jeune.',
    sources: [
      { titre: 'Overjet, détection de carie assistée', url: 'https://www.overjet.com/blog/how-ai-improves-caries-detection-in-dentistry' },
      { titre: 'Dental AI, synthèse des autorisations', url: 'https://en.wikipedia.org/wiki/Dental_AI' },
    ],
  },
  {
    id: 'etude-lecteur-sensibilite',
    date: '2024-01',
    categorie: 'ia',
    maturite: 'disponible',
    titre: 'L’aide au diagnostic fait monter la sensibilité et baisser un peu la spécificité',
    resume:
      'Dans une étude lecteur déposée à la FDA, treize praticiens lisant des bitewings sont passés d’une sensibilité de 57,9 % à 76,2 % pour la carie avec l’aide logicielle. La spécificité, elle, a reculé de 99,3 % à 98,4 %.',
    consequence:
      'On détecte nettement plus de lésions, et on en sur-détecte un peu plus. Le gain est net, mais il n’est pas gratuit : l’outil déplace le curseur, il ne le supprime pas. La décision de traiter reste entièrement la vôtre.',
    reserve:
      'Ces chiffres proviennent de la documentation de l’industriel, pas d’une évaluation indépendante. Ils portent sur treize lecteurs, ce qui est peu.',
    sources: [
      { titre: 'Overjet, étude lecteur sur la détection de carie', url: 'https://www.overjet.com/blog/how-ai-improves-caries-detection-in-dentistry' },
    ],
  },
  {
    id: 'validation-independante-manquante',
    date: '2026-01',
    categorie: 'ia',
    maturite: 'cadre',
    titre: 'Vingt-neuf produits autorisés, validation indépendante inégale',
    resume:
      'Une revue de 2026 recense vingt-neuf produits d’imagerie dentaire assistée autorisés par la FDA, émanant de treize sociétés, jusqu’en juillet 2025. Elle relève que plusieurs plateformes récentes ne disposent pas de validation clinique indépendante.',
    consequence:
      'Une autorisation administrative atteste d’une équivalence à un produit déjà commercialisé. Ce n’est pas une démonstration d’efficacité clinique, et encore moins une démonstration faite par un tiers. Demandez les publications indépendantes avant de signer.',
    reserve:
      'Le décompte s’arrête à juillet 2025 et ne couvre que le marché américain. L’état du marché européen n’a pas pu être établi.',
    sources: [
      { titre: 'Guide des outils d’analyse radiographique autorisés', url: 'https://elegantlab.com/blogs/news/ai-dental-radiograph-tools' },
    ],
  },
  {
    id: 'usag1-repousse',
    date: '2026-08',
    categorie: 'regeneration',
    maturite: 'essai',
    titre: 'Repousse dentaire : l’anticorps anti-USAG-1 passe à l’essai chez l’humain',
    resume:
      'Des travaux japonais ont identifié une voie moléculaire qui freine le développement dentaire, centrée sur la protéine USAG-1. Un anticorps monoclonal la ciblant a déclenché une repousse dentaire chez l’animal, souris puis furet. La société Toregem a levé environ 5,3 millions de dollars pour engager une phase II au Japon.',
    consequence:
      'Rien au fauteuil aujourd’hui. C’est le dossier à suivre pour l’agénésie et l’oligodontie, où l’alternative actuelle reste prothétique ou implantaire à vie.',
    reserve:
      'Les sources divergent sur le stade exact : l’une décrit des essais humains en cours, l’autre une phase II à lancer. Aucune autorisation nulle part, aucun calendrier de mise sur le marché. Si un patient vous en parle, ces deux phrases sont la réponse honnête.',
    sources: [
      { titre: 'Dentistry, état des lieux sur la repousse dentaire chez l’adulte', url: 'https://dentistry.co.uk/2026/08/18/tooth-regrowth-in-adults-what-we-know-so-far/' },
      { titre: 'Decisions in Dentistry, régénération dentaire', url: 'https://decisionsindentistry.com/2026/01/science-takes-a-bite-at-tooth-regeneration/' },
    ],
  },
  {
    id: 'email-cellules-souches',
    date: '2026-01',
    categorie: 'regeneration',
    maturite: 'recherche',
    titre: 'Émail : des structures issues de cellules souches produisent les protéines de l’émail',
    resume:
      'Une équipe de l’université de Washington a obtenu, à partir de cellules souches, des structures capables de produire les protéines qui forment l’émail.',
    consequence:
      'Aucune conséquence clinique à ce stade. L’émail ne se régénère pas spontanément, ce qui rend toute piste de reconstitution biologique notable.',
    reserve:
      'Travaux précliniques. Les gels de régénération de l’émail annoncés par certains sites commerciaux ne s’appuient sur aucune publication clinique, et ne doivent pas être confondus avec ces travaux.',
    sources: [
      { titre: 'Decisions in Dentistry, régénération dentaire', url: 'https://decisionsindentistry.com/2026/01/science-takes-a-bite-at-tooth-regeneration/' },
    ],
  },
  {
    id: 'tnr-2006',
    date: '2026-04',
    categorie: 'reglementation',
    maturite: 'cadre',
    titre: 'Maroc : la base de remboursement n’a pas bougé depuis 2006',
    resume:
      'Le remboursement des soins dentaires se calcule sur la Tarification nationale de référence, et non sur l’honoraire réellement perçu. Cette tarification date de 2006. La CNSS rembourse 70 % de cette base, la CNOPS 80 %. Pour un détartrage, une base de 210 MAD conduit à environ 147 MAD remboursés par la CNSS.',
    consequence:
      'L’écart entre vos honoraires et la base de remboursement se creuse mécaniquement chaque année. Annoncer le reste à charge au devis évite la discussion au fauteuil une fois l’acte fait.',
    reserve:
      'Une fusion CNSS-CNOPS est évoquée par plusieurs guides, sans confirmation par une source officielle. Les montants cités proviennent de sites de cliniques, pas de l’ANAM : vérifiez sur le document officiel avant de les opposer à un patient.',
    sources: [
      { titre: 'Remboursement dentaire au Maroc, CNSS et CNOPS', url: 'https://www.cliniquelabeldent.ma/remboursement-dentaire-maroc' },
      { titre: 'Agence nationale de l’assurance maladie', url: 'https://en.wikipedia.org/wiki/National_Health_Insurance_Agency_(Morocco)' },
    ],
  },
  {
    id: 'implant-non-rembourse',
    date: '2026-04',
    categorie: 'reglementation',
    maturite: 'cadre',
    titre: 'Maroc : l’implant n’est pas pris en charge, la couronne qui le coiffe l’est',
    resume:
      'Ni la CNSS ni la CNOPS ne remboursent l’implant dentaire. La couronne posée sur cet implant reste en revanche remboursable selon les règles habituelles.',
    consequence:
      'Détailler l’implant et la couronne en deux lignes distinctes sur le devis change le reste à charge annoncé, et le rend exact. Un devis global laisse croire que tout est hors remboursement.',
    reserve:
      'Information issue de guides de cliniques privées, à confronter au texte de votre organisme avant d’engager un patient sur un montant.',
    sources: [
      { titre: 'Remboursement de l’implant dentaire au Maroc', url: 'https://centredentairekandil.com/remboursement-de-limplant-dentaire-au-maroc/' },
    ],
  },
];

/** Entrées les plus récentes d'abord. */
export function veilleTriee(): EntreeVeille[] {
  return [...VEILLE].sort((a, b) => b.date.localeCompare(a.date));
}

const MOIS = [
  'janvier', 'février', 'mars', 'avril', 'mai', 'juin',
  'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre',
];

/** « 2025-12 » devient « décembre 2025 ». */
export function formaterMois(aaaaMm: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(aaaaMm);
  if (!m) return aaaaMm;
  const index = Number.parseInt(m[2], 10) - 1;
  return index >= 0 && index < 12 ? `${MOIS[index]} ${m[1]}` : aaaaMm;
}

/** Âge du fil en mois pleins, pour pouvoir avouer qu'il a vieilli. */
export function ageDuFilEnMois(aujourdhui = new Date(), cloture = DATE_VEILLE): number {
  const m = /^(\d{4})-(\d{2})$/.exec(cloture);
  if (!m) return 0;
  const annees = aujourdhui.getFullYear() - Number.parseInt(m[1], 10);
  const mois = aujourdhui.getMonth() + 1 - Number.parseInt(m[2], 10);
  return Math.max(0, annees * 12 + mois);
}

/**
 * Au-delà de ce délai, le fil est présenté comme périmé.
 *
 * Six mois : au rythme des autorisations réglementaires, c'est la durée
 * au-delà de laquelle une absence de nouvelle devient suspecte plutôt que
 * rassurante.
 */
export const MOIS_AVANT_PEREMPTION = 6;

export function filPerime(aujourdhui = new Date()): boolean {
  return ageDuFilEnMois(aujourdhui) >= MOIS_AVANT_PEREMPTION;
}

/** Entrées postérieures à la dernière consultation du praticien. */
export function entreesNouvelles(vuLe: string | null): Set<string> {
  if (!vuLe) return new Set();
  return new Set(VEILLE.filter((e) => e.date > vuLe).map((e) => e.id));
}
