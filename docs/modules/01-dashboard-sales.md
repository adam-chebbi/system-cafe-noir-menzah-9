# Module 1 — Tableau de bord & Ventes (cahier des charges §2)

## 1.1 Tableau de bord

### Indicateurs à afficher (§2.1)
CA du jour, CA du mois, Achats, Dépenses, Valeur du stock, Coût du personnel,
Nombre de tickets, Panier moyen, Marge estimée, Top produits vendus, Produits les
moins vendus, Produits générant le plus de CA, Produits générant le plus de marge,
Principales alertes.

### Filtres (obligatoires)
Aujourd'hui / Hier / Semaine / Mois / Période personnalisée (sélecteur de dates).
Le filtre choisi doit s'appliquer à **tous** les indicateurs de l'écran, pas
seulement certains.

### Comparaison & graphiques
- Bouton/toggle "Comparer à la période précédente" à côté de chaque indicateur clé
  (CA, tickets, panier moyen, marge) → affiche la variation (%, ↑/↓, couleur).
- Graphiques simples (courbe pour évolution CA, barres pour top produits) — pas de
  bibliothèque de visualisation avancée nécessaire, juste lisible pour un
  non-technicien.

### UX
- Écran d'accueil par défaut à l'ouverture de l'application (voir
  `docs/ux-guidelines.md`).
- Chargement progressif : afficher d'abord les chiffres clés (CA jour/mois,
  tickets, panier moyen), puis les listes de produits et le détail, pour que
  l'écran ne semble jamais "vide" en attendant.
- Les "principales alertes" affichées ici sont un résumé (3-5 max) qui renvoie
  vers l'écran complet des alertes (§9.3, voir `08-reports-alerts-audit.md`).

## 1.2 Ventes (§2.2)

### Entrée des ventes — 3 méthodes
1. **Saisie manuelle** (voir formulaire ci-dessous) — accessible en 1 tap depuis
   n'importe où via le bouton d'action rapide "+".
2. **Import Excel**
3. **Import CSV**

Pour les imports (2 et 3) : l'utilisateur choisit le fichier → le système présente
un **tableau d'aperçu** ligne par ligne avec les colonnes reconnues et celles non
reconnues signalées clairement → l'utilisateur peut corriger le mapping de colonnes
et les valeurs avant de cliquer "Importer" → confirmation avec nombre de lignes
importées / ignorées.

### Champs d'une vente (§2.2)
- Produit (sélection depuis le catalogue)
- Variante (si applicable au produit)
- Quantité
- Prix (pré-rempli depuis la fiche produit, modifiable)
- Date (défaut: aujourd'hui, modifiable)
- Nombre de tickets
- Mode de paiement : **Espèces / TPE / Ticket restaurant**
- Type de consommation : **Sur place / À emporter**

### Formulaire de saisie manuelle — flux
`Choisir produit(s) et quantités → Renseigner mode de paiement / type de
consommation / date → Aperçu (récapitulatif du ticket : lignes, total, mode de
paiement) → Confirmer "Enregistrer la vente"`.
Permettre d'ajouter plusieurs lignes produit dans une même vente/ticket avant de
confirmer (un ticket = souvent plusieurs produits).

### Correction / Annulation (§2.2)
- **Corriger** une vente déjà enregistrée : ouvre le même formulaire pré-rempli,
  modification possible de tous les champs, l'ancienne version est conservée dans
  le journal d'activité (§9.4) avec ancienne/nouvelle valeur.
- **Annuler** une vente : confirmation explicite ("Cette vente sera annulée. Elle
  restera visible dans l'historique. Continuer ?"), statut passe à "Annulée",
  n'est plus comptée dans les indicateurs du tableau de bord mais reste consultable
  dans la liste des ventes (filtrable par statut).
- Aucune suppression définitive, dans tous les cas (voir `crud-matrix.md`).

### Entités
- `Vente` (ticket) : date, mode de paiement, type de consommation, statut
  (validée / corrigée / annulée), nombre de tickets, total.
- `LigneVente` : produit, variante, quantité, prix unitaire, sous-total.
