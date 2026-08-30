# Prompt 14 — Module Gestion des tables (plan de salle visuel)

Copie ce texte tel quel dans Google AI Studio une fois le prompt 13 terminé et
validé. Ce module est un ajout par rapport au cahier des charges original (voir
`docs/modules/12-gestion-des-tables.md`) et constitue la pièce maîtresse de la
nouvelle direction visuelle du produit — accorde-lui un soin particulier.

---

Construis maintenant le module Gestion des tables, en te basant entièrement sur
`docs/modules/12-gestion-des-tables.md` pour la logique fonctionnelle et sur
`docs/ui-ux-redesign.md` pour la direction visuelle. Ce module doit ressembler à un
éditeur de plan de salle léger, visuel et interactif — pas à une simple liste
administrative de tables.

## Vue d'ensemble et indicateurs

En haut du module, affiche un résumé rapide et visuel : nombre total de tables,
places totales, tables occupées, tables réservées, tables libres, et tables en
attente. Ajoute un sélecteur permettant de basculer entre le "Plan d'étage"
(visuel) et une vue "Liste" (pour les cas où une vue tabulaire est utile), ainsi
qu'un bouton "Ajouter un espace" bien visible.

## Espaces & étages

- Le système doit supporter plusieurs espaces (par exemple Salle Principale en
  espace principal affiché en premier, puis Terrasse, VIP Room, Étage 1, Étage 2,
  etc.), chacun avec son propre plan visuel, ses propres tables, sa propre
  disposition et ses propres objets.
- Un sélecteur simple (menu déroulant ou navigation de page) permet de changer
  d'espace de façon instantanée et fluide, sans donner l'impression de changer
  d'application.
- Prévois une zone en bas du plan qui liste les autres espaces disponibles avec un
  aperçu rapide (nombre de tables, nombre de places) et un accès direct à chacun.

## Plan de salle visuel et interactif

- Affiche les tables comme des formes visuelles positionnées sur un plan (pas une
  liste), avec leur nom/numéro et leur capacité affichés directement sur la forme.
- Chaque table est immédiatement reconnaissable par son statut grâce à une couleur
  discrète et cohérente avec la légende de l'application : Libre, Occupée,
  Réservée, En attente, Fermée/Inactive — toujours accompagnée d'un libellé
  visible au clic ou au survol, jamais uniquement par la couleur.
- Un mode "édition" explicite et clairement activable/désactivable doit permettre
  à l'administrateur de modifier le plan (déplacer, ajouter, configurer) sans
  risquer de le faire par accident pendant l'exploitation normale.
- En mode édition, les tables sont **déplaçables par glisser-déposer**
  directement sur le plan, avec un retour visuel clair pendant le déplacement, et
  un positionnement fonctionnant aussi bien à la souris qu'au doigt sur tablette.
- Le plan doit aussi permettre de gérer visuellement des éléments non-table utiles
  au repère spatial : murs, portes, fenêtres, plantes, autres objets — ajoutables,
  déplaçables, modifiables, supprimables comme les tables.
- Cycle d'interaction complet sur chaque élément du plan : **Sélectionner →
  Déplacer → Modifier → Dupliquer → Supprimer**, avec des contrôles visuels
  explicites (pas de raccourcis clavier cachés comme seul moyen d'action).

## Création de table — expérience visuelle

Le parcours de création doit être : **choisir la forme → choisir la capacité →
créer → positionner sur le plan**, pas un formulaire technique classique. Couvre
au minimum les configurations suivantes et laisse la possibilité d'en définir
d'autres : table carrée 2 places, table ronde 2 places, table carrée 4 places,
table ronde 4 places, table carrée 5 places, table ronde 5 places, table
rectangulaire 6 places, tables plus grandes, formats configurables additionnels
(rectangle, banquette, ronde étendue). Chaque table créée doit pouvoir recevoir un
nom/numéro et une orientation.

## Panneau de table sélectionnée

Quand une table est sélectionnée (en mode édition ou en consultation), un panneau
contextuel apparaît sur le côté (ou en overlay sur mobile) avec ses informations
complètes : nom/numéro, capacité, statut actuel, identifiant, espace, position,
forme, notes, informations de réservation basiques si disponibles, historique
pertinent. Le panneau propose des actions rapides directement accessibles sans
changer de page : **Modifier, Dupliquer, Déplacer, Supprimer** — cohérent avec le
principe général "moins de clics" de `docs/ui-ux-redesign.md`.

## CRUD complet

Assure-toi que l'ensemble du cycle CRUD décrit dans
`docs/modules/12-gestion-des-tables.md` est bien couvert : création de tables,
d'espaces, d'objets de plan ; lecture de toutes leurs informations ; modification
du nom, de la capacité, de la forme, de la position, de l'espace associé ;
suppression avec confirmation explicite, en privilégiant l'archivage plutôt que la
suppression définitive pour une table ayant un historique lié.

## Cohérence avec le reste du système

- Ce module reste entièrement séparé du menu digital public (§10 du cahier des
  charges) — aucune information de plan de salle n'est exposée publiquement.
- Aucune fonctionnalité d'intelligence artificielle : le positionnement et
  l'organisation du plan restent une manipulation directe et manuelle de
  l'administrateur, jamais un placement "suggéré" automatiquement par un
  algorithme d'optimisation ou d'IA.
- Reste dans le même système de design que le reste de l'application (couleurs,
  typographie, icônes professionnelles, absence d'emoji) et dans la même coquille
  Navigation Rapide.

Peuple ce module avec un **agencement réaliste et complet** représentatif d'un
café tunisien : un espace "Salle Principale" avec une dizaine de tables de formes
et capacités variées déjà positionnées de façon cohérente (comptoir, coin fenêtre,
etc.), et au moins deux espaces secondaires (par exemple Terrasse et VIP Room) avec
quelques tables chacun, avec des statuts variés (quelques tables occupées,
quelques réservées, la majorité libres) pour que le plan soit démontrable de façon
crédible dès la première visite, comme dans le prototype de référence fourni pour
ce module.
