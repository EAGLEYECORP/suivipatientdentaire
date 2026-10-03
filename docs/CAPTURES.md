# Galerie — Suivi Patient Dentaire

Captures prises sur l'application compilée, avec le jeu de démonstration livré
au premier lancement. Aucune maquette : tout ce qui est montré fonctionne.

[← Retour au README](../README.md)

---

## Odontogramme anatomique

Chaque couronne est dessinée à ses dimensions anatomiques réelles et posée sur
la courbe de l'arcade, avec les cinq faces cliquables découpées dans sa
silhouette. Le panneau de droite donne l'état, les faces atteintes, la note
clinique et la **biographie complète de la dent**.

![Odontogramme anatomique](03-odontogramme.png)

### Remontée temporelle

Le curseur reconstitue la bouche telle qu'elle était à chaque date de
modification, à partir du seul journal des événements.

![Remontée temporelle](04-remontee-temporelle.png)

### Vue grille

Plus dense et plus rapide à saisir au fauteuil, disponible d'un clic.

![Vue grille](05-vue-grille.png)

---

## Charting parodontal

Six sites par dent, saisie en rafale au clavier, profondeurs colorées selon la
sévérité. Le diagnostic — stade, grade, étendue, stabilité selon la
classification 2018 — est calculé automatiquement, **avec la liste des critères
retenus**.

![Charting parodontal](06-charting-parodontal.png)

---

## Aide à la décision clinique

L'alerte critique indique la donnée du dossier qui l'a déclenchée et la conduite
proposée. Les dents concernées sont cliquables.

![Aide à la décision](10-aide-decision.png)

### Profil de risque et intervalle de rappel

Risque carieux et risque parodontal à six vecteurs, d'où découle l'intervalle de
rappel conseillé.

![Profil de risque](11-profil-de-risque.png)

---

## Devis à variantes

Plusieurs solutions comparées côte à côte, avec le reste à charge de chacune.
L'option retenue devient le plan de traitement en un clic.

![Devis à variantes](08-devis-variantes.png)

### Plan de traitement

![Plan de traitement](09-plan-de-traitement.png)

---

## Imagerie

Radios et photos stockées sur le poste, rattachées aux dents, chiffrées avec le
coffre quand il est actif.

![Imagerie](12-imagerie.png)

### Visionneuse

Zoom, négatif, contraste et annotations posées au clic.

![Visionneuse](13-visionneuse.png)

---

## Agenda

Grille horaire, création par clic sur un créneau, détection des conflits par
praticien.

![Agenda](14-agenda.png)

---

## Facturation

![Facture](15-facture.png)

---

## Pilotage du cabinet

Encaissements, taux de recouvrement, acceptation des devis, absentéisme, charge
par praticien, répartition des actes et **moteur de rappels**.

![Pilotage](16-pilotage.png)

---

## Tableau de bord

![Tableau de bord](01-tableau-de-bord.png)

## Liste des patients

![Patients](02-patients.png)

---

## Palette de commandes

`⌘K` ouvre n'importe quel dossier, écran ou action sans quitter le clavier.

![Palette de commandes](17-palette.png)

---

## Sécurité

Activation du coffre chiffré, avec indicateur de robustesse de la phrase secrète
et avertissement explicite.

![Sécurité](18-securite.png)

### Coffre verrouillé

Tant que la phrase n'est pas fournie, aucune donnée patient n'est en mémoire.

![Coffre verrouillé](19-coffre-verrouille.png)

---

## Sur mobile

![Mobile](20-mobile.png)

---

## Captures cadrées pour la vitrine

Ces deux captures sont cadrées sur un bloc précis plutôt que sur la page
entière : elles servent la page publique, où une capture de page complète
réduite devient illisible.

### Arcade complète

Le schéma des deux arcades, avec la palette d'états et la remontée temporelle.
La capture `03-odontogramme.png` montre le haut du dossier, où l'arcade est
encore sous la ligne de flottaison.

![Arcade complète](21-arcade-complete.png)

### Dossier médical et profil de risque

Le raisonnement affiché à côté de son résultat : rappel conseillé et sa
justification, facteurs de risque carieux, six vecteurs parodontaux avec leurs
valeurs.

![Profil de risque complet](22-profil-de-risque-complet.png)
