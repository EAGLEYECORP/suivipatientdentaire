# Suivi Patient Dentaire

Logiciel de cabinet dentaire : **odontogramme anatomique**, **charting parodontal avec diagnostic
automatique**, imagerie, aide à la décision clinique, plans de traitement, agenda, facturation et
pilotage. Interface en français, fonctionnement **hors ligne**, données **chiffrées sur le poste**.

![Odontogramme anatomique](docs/03-odontogramme.png)

**[→ Galerie complète : 19 captures de tous les modules](docs/CAPTURES.md)**

---

## Ce qui distingue cette application

|                                       |                                                                                                                         |
| ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Odontogramme anatomique**           | Les couronnes ne sont pas des cases : chacune est dessinée à ses dimensions réelles et posée sur la courbe de l'arcade. |
| **Diagnostic parodontal automatique** | Sondage à six sites par dent, stade et grade selon la classification 2018, avec le raisonnement affiché.                |
| **Journal inviolable**                | Chaque modification est tracée. Le schéma dentaire se rejoue à n'importe quelle date, et chaque dent a sa biographie.   |
| **Aide à la décision explicable**     | Des règles déterministes croisent traitements, allergies et actes programmés. Jamais de boîte noire.                    |
| **Chiffré au repos**                  | AES-256-GCM, clé dérivée de la phrase secrète du cabinet. Sans elle, le disque est illisible.                           |
| **Hors ligne et installable**         | Aucune dépendance réseau à l'exécution. S'installe comme une application.                                               |

---

## Modules

### Odontogramme anatomique

![Charting parodontal](docs/06-charting-parodontal.png)

- Numérotation **FDI / ISO 3950** : 32 dents permanentes, 20 temporaires.
- Chaque couronne est dessinée à ses **dimensions anatomiques moyennes** (diamètres mésio-distal et
  vestibulo-lingual réels, maxillaire et mandibule distincts) et posée par **longueur d'arc cumulée**
  sur une ellipse mise à l'échelle : l'espacement est anatomique et chaque dent pivote avec la
  tangente de l'arcade. Arcade maxillaire ovoïde, mandibulaire plus étroite et parabolique.
- Silhouettes par type de dent (incisive aplatie, canine cuspidée, prémolaire ovale, molaire
  quadrangulaire) et sillons occlusaux.
- Saisie **par face** (mésiale, distale, vestibulaire, linguale/palatine, occlusale) avec orientation
  anatomique garantie quelle que soit la rotation : le vestibulaire pointe toujours vers l'extérieur
  de l'arcade, le mésial vers la ligne médiane. Les dents antérieures n'exposent pas de face occlusale.
- 11 états cliniques, **mode peinture** (choisir un état puis cliquer les faces), note par dent.
- **Vue grille** disponible d'un clic : plus rapide à saisir au fauteuil.
- **Garde-fou de dentition** : une dent relevée hors de la dentition affichée est signalée au lieu de
  disparaître silencieusement.

### Parodontologie

- Sondage complet : **six sites par dent** — profondeur de poche, marge gingivale, saignement, plaque,
  suppuration — plus mobilité et furcation (proposée uniquement sur les pluriradiculées).
- **Saisie en rafale** : le curseur avance seul après chaque profondeur. `S` saignement, `P` plaque,
  `U` suppuration, flèches pour naviguer. Profondeurs colorées du vert au rouge sombre.
- Indices automatiques : saignement, plaque, poches ≥ 4 et ≥ 6 mm, poche maximale, perte d'attache,
  furcations, sites sondés.
- **Classification 2018 (AAP/EFP)** : stade I-IV, grade A-C, étendue, stabilité — avec la liste des
  critères retenus. Le praticien voit le raisonnement et garde la décision.
- Comparaison avec le sondage précédent et réévaluation en un clic.

La perte d'attache retenue pour la stadification **distingue le sulcus physiologique d'une vraie
perte** : un parodonte sain n'est pas classé à tort en parodontite. La définition de cas exige deux
dents **non adjacentes**, et les dents absentes sont exclues des indices.

### Aide à la décision clinique

![Vigilance clinique](docs/10-aide-decision.png)

Des règles déterministes, chacune motivée par la donnée qui l'a déclenchée :

- **Sécurité** — risque hémorragique (anticoagulant croisé avec un geste sanglant), ostéonécrose des
  mâchoires (antirésorptif croisé avec une chirurgie), antibioprophylaxie de l'endocardite, conflits
  d'allergie (anesthésiques, bêta-lactamines, latex), grossesse, diabète déséquilibré avant
  chirurgie, tabac avant implant.
- **Clinique** — carie relevée sans acte programmé, dent à extraire sans avulsion inscrite, dent
  postérieure dépulpée sans coiffe prévue, contrôle dépassé.
- **Profils de risque** — risque carieux dans l'esprit de CAMBRA, risque parodontal à six vecteurs
  (saignement, poches résiduelles, perte osseuse rapportée à l'âge, dents absentes, tabac, terrain
  systémique), et **intervalle de rappel conseillé** retenant le plus court des deux.

Le tableau de bord agrège la vigilance sur l'ensemble du cabinet.

### Journal, remontée temporelle et biographie de la dent

- Chaque mutation écrit un événement **horodaté, signé par le praticien actif, avec l'état avant et
  après**. Le journal n'est ni modifié ni purgé.
- **Curseur de temps** : la bouche est reconstituée telle qu'elle était à chaque date, en lecture
  seule, à partir des seuls événements du journal.
- **Biographie par dent** : toute la vie d'une dent — états, actes, notes — avec auteur et horodatage.

### Imagerie

- Import par glisser-déposer, typé (rétro-alvéolaire, bitewing, panoramique, cone beam, photo) et
  rattaché aux dents concernées.
- Binaires dans **IndexedDB**, vignettes compressées à l'import.
- **Chiffrés avec la clé du coffre** quand il est actif : une radio récupérée sur le disque sans la
  phrase secrète reste illisible.
- Visionneuse : zoom, négatif, contraste, annotations posées au clic.

### Devis à variantes

![Devis comparés](docs/08-devis-variantes.png)

- Plusieurs solutions thérapeutiques **présentées côte à côte**, avec honoraires, base de
  remboursement et reste à charge, et mise en évidence de l'option la moins coûteuse.
- Comparateur imprimable, remis au patient pour un consentement éclairé.
- Décision tracée (acceptation, refus, prolongation, expiration), et l'option retenue **se transforme
  en actes du plan de traitement** en un clic.

### Nomenclature et couverture

Le catalogue d'actes n'est pas câblé sur un seul pays. Le cabinet choisit sa
nomenclature dans les paramètres, ce qui change d'un coup le catalogue, les
régimes proposés et la devise conseillée :

| Nomenclature       | Actes | Régimes                                            |
| ------------------ | ----- | -------------------------------------------------- |
| France — CCAM      | 23    | Assurance maladie 70 %, CSS 100 %, sans couverture |
| Maroc — NGAP / TNR | 14    | CNSS 70 %, CNOPS 80 %, sans couverture             |

Le remboursement se calcule partout de la même façon : **tarif de référence ×
taux du régime du patient**. C'est la base de remboursement en France, la
Tarification nationale de référence au Maroc. Chaque patient porte son régime,
et un dossier dont le régime n'existe pas dans la nomenclature active est
signalé plutôt que calculé en silence à zéro.

### Plans de traitement, agenda, facturation

- Catalogue d'actes codés, avec honoraires, tarif de référence et durée.
- Actes rattachés aux dents et aux faces, organisés par séance ; totaux et reste à charge.
- Agenda en grille horaire et en liste, création par clic sur un créneau, **détection des conflits**
  par praticien, filtrage, couleurs de praticien.
- Facturation des actes réalisés, numérotation annuelle séquentielle, règlements multiples, statut
  déduit des encaissements, facture imprimable seule.
- Ordonnances : sept modèles odontologiques, **désactivés quand une allergie du dossier les
  contre-indique**, imprimables avec en-tête et signature.

### Pilotage du cabinet

![Pilotage](docs/16-pilotage.png)

Encaissements, taux de recouvrement, **taux d'acceptation des devis** (en nombre et en valeur, calculé
sur les seuls devis décidés), taux de rendez-vous non honorés, charge par praticien, répartition des
actes, **actes réalisés jamais facturés**, et **moteur de rappels** listant les patients à recontacter
— les patients déjà reprogrammés étant écartés.

### Palette de commandes

![Palette ⌘K](docs/17-palette.png)

`⌘K` / `Ctrl+K` ouvre n'importe quel dossier, écran ou action sans quitter le clavier, avec recherche
insensible aux accents sur nom, téléphone, e-mail, numéro de sécurité sociale et mutuelle.

---

## Sécurité et confidentialité

Les données ne quittent jamais le poste : **aucun serveur, aucun envoi réseau, aucune dépendance CDN**.

Le coffre, activable dans les paramètres, chiffre l'intégralité du magasin :

- **AES-256-GCM**, clé dérivée par **PBKDF2-SHA-256, 310 000 itérations**, sel aléatoire de 16 octets,
  IV distinct à chaque scellement.
- La clé vit en mémoire et **n'est jamais persistée** : fermer l'onglet referme le coffre.
- Verrouillage manuel ou automatique après inactivité.
- Les images sont chiffrées avec la même clé.

**La phrase secrète n'est stockée nulle part. Perdue, les données sont irrécupérables.** Exportez une
sauvegarde avant d'activer le coffre.

> Cette application n'est pas un dispositif médical et n'intègre pas d'authentification multi-postes.
> Avant tout usage sur des données de santé réelles, prévoyez l'hébergement et les mesures exigés par
> la réglementation applicable (en France, hébergement de données de santé et RGPD). Les règles d'aide
> à la décision sont une assistance, jamais une prescription : le praticien reste seul responsable.

---

## Démarrage

```bash
npm install
npm run dev        # http://localhost:5173
```

Au premier lancement, un cabinet de démonstration complet est chargé — 8 patients, schémas dentaires
renseignés, sondages parodontaux, actes, rendez-vous, factures, devis et journal historique — pour que
chaque écran soit immédiatement utilisable. Remplaçable ou effaçable depuis **Paramètres → Données**.

```bash
npm run build      # build de production + précache du service worker
npm run preview    # sert le build de production
npm run test       # 168 tests (Vitest)
npm run lint       # vérification TypeScript
```

---

## Vitrine publique et application

Le site porte deux documents distincts, voisins dans le même dossier publié :

| Adresse | Document | Rôle |
| --- | --- | --- |
| `/` | `index.html` | Vitrine publique : HTML servi tel quel, indexable |
| `/app.html` (ou `/app`) | `app.html` | Poste de travail clinique, React |

La vitrine est écrite à la main, en HTML et CSS, sans React ni Tailwind. Elle
pèse une dizaine de kilo-octets de feuille de style et moins d'un kilo-octet de
script, et elle ne charge pas le paquet applicatif : une personne qui découvre
le produit n'a aucune raison de télécharger le charting parodontal et la
visionneuse d'imagerie.

Quelques points qui ne se devinent pas à la lecture des fichiers :

- **`app.html` est un fichier voisin de `index.html`, pas un sous-répertoire.**
  Toutes les adresses relatives de l'application (`./assets`, `./sw.js`,
  `./manifest.webmanifest`) continuent donc de résoudre, et le service worker
  garde la racine pour portée.
- **L'apparition au défilement est en CSS seul** (`animation-timeline: view()`,
  sous `@supports`). Une version pilotée en JavaScript laissait toute la page
  invisible si le script échouait à se charger. Sans le script, et sur les
  navigateurs sans défilement animé, le contenu s'affiche simplement.
- **Les anciennes adresses sont rattrapées.** L'application a vécu à la racine :
  un signet vers `/#/patients` est redirigé vers `/app.html#/patients`, et une
  application déjà installée, qui démarre en fenêtre autonome, va directement au
  poste de travail sans passer par la page de présentation.
- **Le manifeste démarre sur `app.html`** : on installe un outil de travail, pas
  une page de présentation.
- **Les visuels de la vitrine ne sont pas précachés.** Le cache hors ligne est
  réservé au poste clinique ; la page publique se consulte en ligne.

Les captures de la vitrine sont dérivées de `docs/` par
`node scripts/vitrine-images.mjs`, qui les réduit à la largeur d'affichage et
les convertit en WebP (environ 420 Ko pour l'ensemble, contre 3 Mo en PNG). Les
sorties sont versionnées dans `public/vitrine/` : la compilation n'a pas besoin
de `sharp`.

## Architecture

```
src/
  components/
    OdontogrammeArcade.tsx   Arcade anatomique (pose, rotation, faces cliquables)
    DentalChart.tsx          Vue grille
    ToothPanel.tsx           Dent sélectionnée + biographie
    perio/                   Grille de sondage, panneau de diagnostic, onglet
    OngletImagerie.tsx       Import, galerie, visionneuse annotable
    OngletDevis.tsx          Devis à variantes et comparateur
    OngletOrdonnances.tsx    Modèles de prescription
    PanneauAlertes.tsx       Aide à la décision
    PanneauRisques.tsx       Profils de risque carieux et parodontal
    PaletteCommandes.tsx     ⌘K
    EcranVerrouillage.tsx    Déverrouillage du coffre
    ui/                      Primitives (Button, Card, Modal, Field, Badge…)
  pages/                     Dashboard, Patients, PatientDetail, Agenda,
                             Traitements, Facturation, Pilotage, Parametres
  data/
    teeth.ts                 Numérotation FDI, anatomie, états cliniques
    anatomie.ts              Dimensions coronaires, pose sur l'arcade, silhouettes
    perio.ts                 Mesures, indices, classification 2018
    actes.ts                 Catalogue CCAM
    medicaments.ts           Modèles d'ordonnance et contre-indications
    seed.ts                  Jeu de démonstration
  lib/
    crypto.ts                Coffre AES-GCM / PBKDF2
    storage.ts               Persistance, migrations, export/import
    imagerie.ts              IndexedDB, vignettes, chiffrement des binaires
    decision.ts              Règles cliniques et profils de risque
    historique.ts            Rejeu du journal, biographie, activité
    finance.ts               Totaux, statuts, numérotation
    pilotage.ts              Indicateurs et moteur de rappels
  store/AppContext.tsx       État applicatif, journalisation, coffre
  types/                     Modèle de domaine typé
```

**Pile technique** : React 18, TypeScript strict, Vite, Tailwind CSS, React Router, Vitest +
Testing Library. Aucune dépendance réseau à l'exécution — polices système, pas de CDN.

### Stockage

Dossier dans `localStorage` (clé `suivi-patient-dentaire:v1`), images dans IndexedDB, chiffrés quand
le coffre est actif. Les sauvegardes v1 sont **migrées automatiquement** en v2.

Pour un usage multi-postes, `src/lib/storage.ts` est le seul module à réécrire : tout le reste passe
par le magasin `src/store/AppContext.tsx`.

---

## Tests

168 tests couvrent :

- la numérotation FDI, l'anatomie et la **géométrie de l'arcade** (symétrie, non-chevauchement,
  courbure, boîte englobante) ;
- les **mesures et la classification parodontales** — sulcus sain contre perte d'attache, adjacence,
  seuils de stade et de grade, exclusion des dents absentes ;
- les **règles de décision** — déclenchement, non-déclenchement, tri par gravité, seuils de risque ;
- le **rejeu du journal** — remontée temporelle, cloisonnement entre patients, journal désordonné,
  cohérence entre rejeu et schéma courant ;
- le **chiffrement** — aller-retour, refus de phrase incorrecte, sel et IV distincts, images
  illisibles sans clé ;
- la **facturation et le pilotage** — totaux, statuts, numérotation annuelle, ventilation mensuelle,
  taux, rappels ;
- les **nomenclatures** — intégrité des catalogues, taux CNSS et CNOPS, régime inconnu ;
- la persistance, les migrations v1 → v3, et des **parcours applicatifs de bout en bout**.

```bash
npm run test
```

---

## Déploiement

`netlify.toml` est fourni et couvre la configuration complète :

- commande de compilation et dossier publié, Node 22 ;
- `sw.js` et `index.html` toujours revalidés — sans quoi un poste resterait
  bloqué sur une version périmée ; `/assets/*` mis en cache définitivement
  puisque leurs noms portent un hachage ;
- `manifest.webmanifest` servi en `application/manifest+json`, faute de quoi
  l'application cesse d'être installable sans aucun message d'erreur ;
- en-têtes de sécurité, dont une **politique de sécurité de contenu stricte** :
  l'application ne chargeant aucune ressource externe, `script-src` reste à
  `'self'` sans `unsafe-inline` ;
- **indexation différenciée** : `X-Robots-Tag: noindex` ne porte plus sur tout
  le site mais sur `/app.html` seul, pour que la vitrine soit référençable et
  que le poste clinique ne le soit pas. `robots.txt` et `sitemap.xml` disent la
  même chose ;
- redirection de `/app` vers `/app.html`.

La CSP a été vérifiée dans un navigateur contre l'application compilée : tous
les écrans, l'import d'images (`blob:`), la génération de vignettes, le service
worker, l'activation du coffre WebCrypto et l'export de sauvegarde, sans aucune
violation. La vitrine a été éprouvée de la même façon, en bureau et en mobile :
elle ne porte ni script ni style en ligne, et passe donc la politique sans
recourir à `unsafe-inline`.

Le chiffrement et le service worker exigent un **contexte sécurisé** : HTTPS est
indispensable, sinon les deux se désactivent silencieusement.

## Limites connues

- **Denture mixte** : le schéma bascule entre denture permanente et temporaire ; il n'affiche pas
  les deux simultanément. Un enfant en denture mixte se chartre en basculant, et l'application
  signale les dents relevées hors de la vue courante plutôt que de les masquer.
- **Thème sombre** : non fourni. Les couleurs d'état dentaire et d'alerte portent un sens clinique
  qu'un thème sombre devrait redériver entièrement ; un thème à moitié traité serait un risque de
  lecture, pas un confort.
- **Monoposte** : pas de synchronisation entre postes ni de comptes utilisateurs. Le praticien actif
  signe le journal mais n'est pas authentifié.
- **Catalogues à confirmer** : aucune des deux nomenclatures n'a été confrontée à sa source officielle.
  Le jeu marocain est partiel (14 actes) et ses valeurs proviennent de sources secondaires, les
  documents de l'ANAM et de la CNOPS n'étant pas accessibles. La Tarification nationale de référence
  date de 2006 et n'a pas été revalorisée depuis. À vérifier avant tout usage de facturation ;
  l'application le signale dans les paramètres.
- **Pas de télétransmission** : ni feuille de soins électronique en France, ni formulaire de
  remboursement AMO au Maroc.
