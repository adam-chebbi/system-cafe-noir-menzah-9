# Module 3 — Gestion des stocks (cahier des charges §4)

## 3.1 Zones de stockage (§4.1)
Deux zones **fixes**, non paramétrables en V1 : **Réserve principale** et
**Dépôt**. Ne pas construire d'écran "Ajouter une zone". Un même article peut avoir
un stock dans les deux zones simultanément (stock par zone, pas de stock global
unique).

## 3.2 Mouvements de stock (§4.2)

### Champs d'un mouvement
Date et heure, Produit (ou ingrédient), Quantité, Zone concernée, Origine,
Destination, Motif, Commentaire.

### Types de mouvement à couvrir
- Entrée (réception fournisseur — normalement générée automatiquement depuis une
  réception validée, module Fournisseurs, mais doit aussi être saisissable
  manuellement pour les cas non couverts par un bon de commande).
- Sortie (vente — générée automatiquement depuis la consommation théorique, doit
  aussi être ajustable manuellement).
- Transfert entre Réserve principale ↔ Dépôt : **lié automatiquement**, càd qu'un
  transfert crée à la fois une sortie de la zone origine et une entrée dans la zone
  destination en une seule opération utilisateur (pas deux saisies séparées).
- Perte/ajustement (voir module 3.4, mais visible aussi comme mouvement de stock).

### Formulaire — flux
`Type de mouvement (Entrée / Sortie / Transfert) → Produit + quantité → Zone(s)
concernée(s) → Motif/commentaire → Aperçu → Confirmer`. Accessible en 2 taps depuis
n'importe où (voir `ux-guidelines.md`).

### Stock négatif (§4.2)
**Autorisé, jamais bloqué.** Dès qu'un mouvement ferait passer un stock sous zéro,
enregistrer le mouvement normalement et déclencher une alerte "Stock négatif"
(§9.3) — ne jamais empêcher la validation du formulaire pour cette raison.

### Historique
Modifications et annulations de mouvements restent dans l'historique (voir
`crud-matrix.md` — jamais de suppression physique).

## 3.3 Inventaires (§4.3)

### Types
Inventaire complet, par catégorie, ou par zone — l'utilisateur choisit le
périmètre au lancement.

### Écran de comptage
Liste des articles du périmètre choisi, chacun affichant : Stock théorique
(calculé), champ de saisie "Stock réel" (rempli par l'utilisateur lors du
comptage), Écart (calculé en direct : réel − théorique), Valeur estimée de l'écart
(écart × coût moyen pondéré de l'article).

### Validation de l'inventaire (§4.3)
À la validation, choix explicite proposé à l'utilisateur pour l'ensemble de
l'inventaire (ou idéalement article par article si le besoin se présente) :
- **Option 1 — Ajuster le stock au stock réel** : le stock système est corrigé
  pour correspondre au comptage.
- **Option 2 — Conserver le stock théorique** : aucun ajustement, mais l'écart
  est quand même enregistré pour analyse.
Dans les deux cas, l'écart reste enregistré et consultable (rapport des pertes,
tableau de bord).

### Flux
`Choisir le périmètre (complet/catégorie/zone) → Saisir le stock réel article par
article (avec écart affiché en direct) → Aperçu récapitulatif des écarts (quantité
+ valeur) → Choisir Option 1 ou 2 → Confirmer`.

## 3.4 Pertes & ajustements (§4.4)

### Motifs disponibles
Perte, Casse, Péremption, Consommation interne, Produit offert, Erreur de
préparation, Ajustement d'inventaire, Autre.

### Formulaire
`Produit/ingrédient → Quantité → Motif (liste ci-dessus) → Zone → Commentaire →
Aperçu → Confirmer`. Génère un mouvement de stock de type "sortie" lié au motif.

### Rapport des pertes
Écran listant les pertes sur une période, filtrable par motif/produit/zone,
affichant total en quantité **et** en valeur (valeur = quantité × coût moyen
pondéré au moment de la perte).

## 3.5 Lots, péremptions & seuils (§4.5)

### Lots — facultatifs par produit
Sur la fiche produit/ingrédient, un interrupteur "Gérer les lots pour cet article"
(désactivé par défaut). Si activé, chaque réception peut/doit renseigner un numéro
de lot et une date de péremption.

### Alertes de péremption
Délai d'alerte **paramétrable** (ex: "alerter X jours avant péremption") — réglage
par article ou valeur par défaut globale modifiable dans les paramètres.

### Seuils
Chaque produit/ingrédient peut avoir un **seuil minimum** et un **stock cible**,
saisis sur sa fiche.

### Alertes générées (voir aussi §9.3)
- Produits expirés (date de péremption dépassée)
- Produits sous leur seuil minimum

## 3.6 Valorisation du stock (§4.6)

**Coût moyen pondéré (CMP) uniquement** — pas de FIFO/LIFO, pas de choix de
méthode dans les paramètres. Le CMP se recalcule à chaque réception/achat
(nouvelle quantité × nouveau prix moyenné avec le stock existant) et sert à :
Valeur du stock (tableau de bord), Coût des ingrédients, Coût matière (module
Recettes), Marges estimées.

## Entités
- `ZoneStock` (fixe : Réserve principale, Dépôt)
- `StockArticle` (produit/ingrédient × zone × quantité × CMP)
- `MouvementStock` (type, date/heure, produit, quantité, zone(s), origine,
  destination, motif, commentaire, statut)
- `Inventaire`, `LigneInventaire` (stock théorique, stock réel, écart, valeur écart)
- `Lot` (numéro, date de péremption, quantité, article lié)
- `SeuilStock` (seuil minimum, stock cible, par article)
