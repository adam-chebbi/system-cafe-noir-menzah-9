# Module 12 — Gestion des tables (extension, hors cahier des charges initial)

> **Statut de ce module : avenant fonctionnel.** Le module "Gestion des tables"
> n'existait pas dans `docs/cahier-des-charges.md` signé (V1). Il est ajouté ici à
> la demande explicite du client, en complément du périmètre initial, et doit être
> traité comme tel dans toute communication avec le client (devis complémentaire /
> avenant, cf. §15 du cahier des charges). Il suit dès sa conception le langage
> visuel défini dans `docs/ui-ux-redesign.md` et la référence visuelle fournie
> (prototype "Café Noir Système — Gestion des tables").

## Objectif

Donner à l'administrateur une **représentation visuelle et spatiale** des espaces
réels du café (salle principale, terrasse, VIP, étages), plutôt qu'une simple
liste administrative de tables — proche d'un éditeur de plan de salle léger, avec
glisser-déposer, statuts visuels immédiats, et un CRUD complet.

## 12.1 Espaces & étages

- Le système supporte **plusieurs espaces**, chacun avec son propre plan visuel :
  par exemple Salle Principale (espace principal, affiché en premier), puis
  Terrasse, VIP Room, Étage 1, Étage 2, etc.
- Chaque espace peut avoir ses propres : tables, disposition, positions,
  capacités, objets de plan (murs, portes, fenêtres, plantes...), configuration.
- Changer d'espace se fait via un sélecteur simple (menu déroulant ou navigation de
  page) et doit être **instantané et visuellement fluide** — l'utilisateur ne doit
  jamais avoir l'impression de changer d'application.
- L'espace principal apparaît en premier, les autres espaces suivent dans une
  hiérarchie claire et lisible.

## 12.2 Création de tables — expérience visuelle

La création est **visuelle plutôt que technique** :
`Choisir la forme → Choisir la capacité → Créer → Positionner sur le plan`.

### Formes et capacités à couvrir (liste non limitative)
Table carrée 2 places, table ronde 2 places, table carrée 4 places, table ronde 4
places, table carrée 5 places, table ronde 5 places, table rectangulaire 6 places,
tables plus grandes, et tout autre format configurable (rectangle, banquette,
"ronde+" pour capacités étendues, etc.).

Chaque configuration de table doit permettre de définir : forme, capacité,
orientation, et un nom/numéro d'identification.

## 12.3 Plan de salle en glisser-déposer

- Les tables doivent pouvoir être **déplacées directement sur le plan visuel** par
  glisser-déposer, pour reproduire numériquement l'agencement réel du café.
- Retour visuel clair pendant le déplacement (ombre, surbrillance, aimantation
  légère sur une grille si pertinent) et positionnement sans effort sur écran
  tactile.
- Le plan doit supporter un cycle d'interaction complet :
  **Sélectionner → Déplacer → Modifier → Dupliquer → Supprimer**, avec des
  contrôles visuels explicites à chaque étape.

## 12.4 Éditeur de plan visuel

Au-delà des tables, l'administrateur doit pouvoir gérer visuellement des éléments
de plan utiles : murs, portes, fenêtres, plantes, autres objets de décor/repère.

Un **mode édition explicite et clairement identifiable** doit être disponible,
pour que l'administrateur puisse modifier l'environnement sans risquer de changer
la configuration par accident pendant l'exploitation normale (service en cours).
En dehors du mode édition, le plan reste consultable et les tables restent
sélectionnables pour voir leur statut/information, mais pas déplaçables.

## 12.5 CRUD complet

### Créer
- Créer des tables (forme, capacité, orientation, nom/numéro).
- Créer des espaces / étages.
- Créer des éléments de plan configurables (murs, portes, fenêtres, plantes,
  objets).

### Lire
- Voir chaque table, sa capacité, son statut actuel, son espace, sa position et
  toute information pertinente (ID, date de création, notes).

### Modifier
- Changer le nom/numéro d'une table, sa capacité, sa forme, sa position, son
  espace associé, sa configuration.

### Supprimer
- Supprimer une table, un espace (si les conditions le permettent — par exemple un
  espace vide ou après confirmation explicite s'il contient des tables), un
  élément de plan configurable.
- Comme pour le reste de l'application, une suppression à impact sur l'historique
  (ex: une table ayant eu des réservations passées) doit être traitée avec la même
  prudence que dans `docs/crud-matrix.md` : privilégier la désactivation/archivage
  d'une table à sa suppression définitive si elle a un historique lié, et toujours
  confirmer explicitement une suppression.

Chaque action doit rester évidente sans jamais submerger l'utilisateur d'options.

## 12.6 Statuts visuels des tables

États à distinguer clairement, en couleur + libellé (jamais couleur seule) :
**Libre, Occupée, Réservée, En attente, Fermée/Inactive** (le cas échéant).

L'administrateur ou un membre du personnel doit pouvoir comprendre l'état de tout
le café **en un coup d'œil** sur le plan, sans avoir à ouvrir chaque table.

## 12.7 Panneau de table sélectionnée

Quand une table est sélectionnée, un panneau contextuel apparaît avec ses
informations complètes : nom/numéro, capacité, statut actuel, identifiant, espace,
position, forme, notes, informations de réservation, historique pertinent.

Ce panneau propose des actions rapides directement accessibles, sans changer de
page : **Modifier · Dupliquer · Déplacer · Supprimer** — cohérent avec le principe
général "moins de clics".

## 12.8 Récapitulatif des indicateurs attendus (vue d'ensemble du plan)

En haut du module, un résumé rapide (à la manière du prototype fourni) : nombre
total de tables, places totales, tables occupées, tables réservées, tables libres,
et le cas échéant tables en attente — utile pour un coup d'œil de gestion sans
entrer dans le détail de chaque table.

## Entités (nouvelles, en complément du modèle de données existant)

- `Espace` (nom, ordre d'affichage, espace principal ou secondaire)
- `Table` (nom/numéro, capacité, forme, orientation, position X/Y, espace associé,
  statut, notes, date de création)
- `ObjetPlan` (type : mur, porte, fenêtre, plante, autre ; position ; espace
  associé)
- Lien optionnel entre `Table` et une future entité de réservation si le client
  souhaite pousser ce module plus loin (hors périmètre de cette première version
  du module Gestion des tables — se limiter à l'affichage d'un statut "Réservée" et
  d'informations de réservation basiques tant qu'un module de réservation complet
  n'est pas explicitement demandé).

## Cohérence avec le reste du système

- Ce module reste **entièrement séparé du menu digital public** (§10 du cahier des
  charges) : le plan de salle et les statuts de table sont des informations
  internes de gestion, jamais exposées publiquement.
- Aucune fonctionnalité d'intelligence artificielle n'intervient dans ce module —
  la gestion des tables reste une manipulation directe et manuelle par
  l'administrateur, y compris pour le positionnement (pas de placement "suggéré"
  automatiquement par un algorithme d'optimisation ou d'IA).
