# Prompt 3 — Modèle de données complet

Copie ce texte tel quel dans Google AI Studio une fois le prompt 2 terminé et
validé.

---

Construis maintenant le modèle de données complet de l'application, à partir de
`docs/crud-matrix.md` (qui couvre déjà les entités du module Gestion des tables en
plus des modules originaux) et de chaque fichier de `docs/modules/`, y compris
`docs/modules/12-gestion-des-tables.md`.

Conçois et implémente le schéma de base de données complet couvrant : tableau de
bord/ventes, produits/recettes/marges, gestion des stocks (zones, mouvements,
inventaires, pertes, lots/péremptions, seuils), fournisseurs/achats/factures, OCR
des factures (documents importés, extractions, correspondances de libellés),
dépenses, employés (fiches, présence, suivi financier), rapports/alertes/journal
d'activité, site/menu digital, et le nouveau module Gestion des tables (espaces/
étages, tables avec forme/capacité/orientation/position, objets de plan).

Respecte scrupuleusement ces règles :

- Aucune entité transactionnelle (ventes, mouvements de stock, factures, dépenses,
  paiements, présences, mouvements financiers employés, réceptions) ne doit
  supporter de suppression physique — prévois statuts et mécanismes de correction/
  annulation avec conservation de l'historique.
- Le journal d'activité doit être structurellement conçu pour être en écriture
  seule côté application, sans exception, y compris pour l'administrateur.
- Les deux zones de stockage (Réserve principale, Dépôt) sont fixes.
- Le catalogue produit respecte la hiérarchie Catégorie → Sous-catégorie →
  Produit.
- Les tables du module Gestion des tables ont une position (coordonnées) modifiable
  par glisser-déposer, une forme, une capacité, une orientation, un statut, et
  sont rattachées à un espace ; un espace peut être marqué comme principal.
- Utilise des types de données appropriés pour les montants financiers (précision
  décimale exacte, jamais de type flottant approximatif) — tout est exprimé en
  dinars tunisiens avec 3 décimales.
- Prévois le stockage des références de fichiers uploadés (chemin ou identifiant
  de stockage durable) pour les factures scannées, les photos de produits, les
  copies de CIN et les justificatifs de dépenses.

Mets en place les migrations correspondantes, dans l'ordre logique des
dépendances. Termine par un résumé clair, en langage non technique autant que
possible, des entités créées et de leur correspondance avec les modules de
`docs/modules/`, pour que je puisse vérifier que rien n'a été oublié ni ajouté en
trop par rapport au périmètre (cahier des charges + avenant Gestion des tables).
