# Module 2 — Produits, Recettes & Marges (cahier des charges §3)

## 2.1 Catalogue (§3.1)

### Structure fixe
`Catégorie → Sous-catégorie → Produit`. Ne pas permettre plus de niveaux, ne pas
permettre de sauter la sous-catégorie (une sous-catégorie par défaut "Général" peut
être créée automatiquement si l'utilisateur ne veut pas en détailler davantage).

### Fiche produit — champs (§3.1)
Nom, Description, Photo, Prix, Catégorie (+ sous-catégorie), Disponibilité
(oui/non ou "disponible / indisponible affiché / masqué" — voir §10.2), Variantes,
Suppléments, Fiche technique (lien vers recette, module 3.2), Coût matière (calculé,
lecture seule), Marge (calculée, lecture seule).

### Formulaire — flux
`Infos générales (nom, catégorie, description, photo) → Prix → Variantes/
Suppléments (optionnel) → Fiche technique (optionnel, lien vers une recette
existante ou création) → Aperçu de la fiche produit telle qu'elle apparaîtra →
Confirmer`.

### CRUD
Voir `docs/crud-matrix.md`. Un produit déjà vendu ne peut pas être supprimé, on le
désactive (masqué du menu digital, non sélectionnable pour une nouvelle vente, mais
son historique de ventes reste intact).

## 2.2 Fiches techniques / Recettes (§3.2)

### Contenu d'une recette
Liste d'ingrédients, chacun avec quantité + unité ; possibilité d'inclure une
sous-recette (ex: une "sauce maison" utilisée dans plusieurs produits).

### Unités & conversions
Unités principales : kg, g, litre, ml, unité. Les conversions entre unités
compatibles (kg↔g, litre↔ml) sont automatiques — l'utilisateur peut saisir dans
l'unité qu'il préfère, le système convertit en interne pour le calcul de coût et de
consommation théorique. Ne jamais convertir entre unités incompatibles (ex: kg ↔
unité) sans une équivalence explicitement définie sur l'ingrédient.

### Recalcul automatique du coût matière
Dès que le coût d'un ingrédient change (nouvel achat, nouvelle facture validée —
voir module Fournisseurs), le coût matière de **toutes** les recettes qui
l'utilisent (directement ou via une sous-recette) doit être recalculé
automatiquement, ainsi que la marge de tous les produits liés.

### Indicateurs affichés sur une fiche recette/produit
Prix de vente, Coût matière, Marge brute estimée, Taux de marge, Comparaison avec
une marge cible (l'utilisateur peut définir une marge cible par produit ou par
catégorie ; affichage type "au-dessus / en-dessous de l'objectif" avec code
couleur, voir `ux-guidelines.md`).

### Formulaire — flux
`Choisir/rechercher un ingrédient → Quantité + unité → Ajouter une autre ligne ou
une sous-recette → Aperçu (coût matière total calculé en direct pendant la saisie)
→ Confirmer`. Le coût matière doit idéalement se recalculer en direct dans
l'aperçu au fur et à mesure que les lignes sont ajoutées, pour que l'utilisateur
voie immédiatement l'impact sur sa marge.

## 2.3 Consommation théorique (§3.3)

Calcul automatique (pas d'écran de saisie dédié) : à partir des ventes enregistrées
et des fiches techniques associées, le système déduit la quantité théorique de
chaque ingrédient consommée sur une période. Cette donnée alimente :
- Le **stock théorique** (module Stock, §4).
- La comparaison stock théorique vs stock réel lors des **inventaires** (§4.3).

Pas d'action manuelle utilisateur ici — uniquement un calcul en arrière-plan,
consultable en lecture depuis les écrans de stock et d'inventaire.

## Entités
- `Categorie`, `SousCategorie`
- `Produit` (avec Disponibilite, PrixVente)
- `Variante`, `Supplement`
- `Recette` (FicheTechnique), `LigneRecette` (ingrédient ou sous-recette + quantité
  + unité)
- `Ingredient` (lié au module Stock/Fournisseurs pour le coût)
