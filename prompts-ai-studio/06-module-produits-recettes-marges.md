# Prompt 6 — Module Produits, Recettes & Marges

Copie ce texte tel quel dans Google AI Studio une fois le prompt 5 terminé et
validé.

---

Construis le module Produits, Recettes & Marges tel que décrit dans
`docs/modules/02-products-recipes-margins.md` (cahier des charges §3), intégré à la
Navigation Rapide et au système de design déjà en place.

Points fonctionnels essentiels :

- Catalogue structuré strictement en Catégorie → Sous-catégorie → Produit.
- Fiche produit : nom, description, photo, prix, catégorie, disponibilité,
  variantes, suppléments, lien vers la fiche technique, coût matière et marge
  affichés en lecture seule et calculés automatiquement.
- Fiches techniques (recettes) composées d'ingrédients avec quantité et unité,
  pouvant inclure des sous-recettes, avec conversions automatiques entre unités
  compatibles (kg/g, litre/ml).
- Recalcul automatique du coût matière et de la marge dès qu'un coût d'ingrédient
  change.
- Affichage du prix de vente, coût matière, marge brute estimée, taux de marge, et
  comparaison visuelle avec une marge cible paramétrable.
- Le formulaire de recette recalcule le coût matière en direct pendant la saisie,
  avant la validation finale.
- La consommation théorique des ingrédients se calcule automatiquement en
  arrière-plan à partir des ventes et des recettes (pas d'écran de saisie dédié).

Utilise des cartes produit visuelles (photo, nom, prix, statut de marge) plutôt que
des tableaux denses pour le catalogue, conformément à `docs/ui-ux-redesign.md`, et
assure-toi que le catalogue reste consultable et modifiable rapidement sur
tablette.

Peuple ce module avec un **catalogue réel et cohérent d'un café tunisien** : vraies
catégories (Boissons chaudes, Boissons froides, Pâtisseries, Snacks, etc.), vrais
produits avec noms réalistes, recettes cohérentes avec de vrais ingrédients et
quantités plausibles, prix de vente réalistes en dinars tunisiens.

Termine en confirmant que les informations internes (coût matière, marge, recette)
ne sont accessibles que depuis l'administration authentifiée.
