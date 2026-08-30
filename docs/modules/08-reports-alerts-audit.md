# Module 8 — Rapports, Alertes & Traçabilité (cahier des charges §9)

## 8.1 Exports (§9.1)
Chaque module pertinent (ventes, stock, fournisseurs/factures, dépenses, employés,
pertes, inventaires) doit proposer un bouton "Exporter" en Excel et CSV pour la
liste actuellement affichée/filtrée — pas besoin d'un écran d'export centralisé
séparé, l'export vit dans chaque liste.

## 8.2 Rapport mensuel PDF (§9.2)

### Contenu (générable automatiquement pour un mois donné)
Chiffre d'affaires, Évolution mensuelle (comparaison au mois précédent), Tickets,
Panier moyen, Achats, Dépenses, Coût du personnel, Marge estimée, Valeur du stock,
Pertes, Écarts d'inventaire, Produits les plus vendus, Produits à faible marge,
Principales alertes du mois.

### Flux
`Écran "Rapports" → Choisir le mois → Aperçu du rapport à l'écran (mêmes données
que le PDF final) → Bouton "Générer le PDF" / "Télécharger"`. Le PDF reprend
exactement l'aperçu — pas de surprise entre ce que l'utilisateur voit et ce qu'il
télécharge.

## 8.3 Alertes (§9.3)

### Affichage
**Dans la plateforme uniquement** — pas de canal externe (voir restrictions
ci-dessous). Icône "cloche" persistante dans l'en-tête (1 tap depuis n'importe où,
voir `ux-guidelines.md`) menant à la liste complète des alertes actives.

### Types d'alertes à générer (règles simples, pas de ML)
- Stock faible (sous le seuil minimum, §4.5)
- Rupture (stock à zéro)
- Stock négatif (§4.2)
- Péremption proche (selon le délai paramétrable, §4.5)
- Produit périmé (date dépassée)
- Facture OCR à vérifier (document importé non encore validé, §6)
- Facture fournisseur à échéance proche (§5.3)
- Écart de stock important (inventaire avec écart au-dessus d'un seuil à définir
  avec le client, ou simplement tout écart non nul signalé — à clarifier lors du
  développement, par défaut signaler tout écart significatif en valeur)
- Marge sous l'objectif (comparaison avec la marge cible du produit, §3.2)

Chaque alerte = une règle de comparaison simple (valeur vs seuil configuré), jamais
un modèle prédictif.

### Restrictions V1 (explicite)
**Aucune alerte SMS, WhatsApp ou Email.** Ne pas intégrer de service d'envoi de
notification externe, même optionnel/désactivé par défaut — c'est hors périmètre.

### Interaction utilisateur
Une alerte peut être marquée "vue/traitée" (disparaît de la liste active) mais
reste historisée (consultable dans un filtre "Toutes / Traitées / Actives") —
jamais supprimée.

## 8.4 Journal d'activité (§9.4)

### Contenu de chaque entrée
Date, Heure, Utilisateur (l'administrateur — utile même à utilisateur unique pour
la traçabilité), Module concerné, Action effectuée, Ancienne valeur (si
pertinent), Nouvelle valeur.

### Déclenchement
Toute action de type création/modification/correction/annulation sur une entité
transactionnelle (voir `crud-matrix.md`) doit écrire une entrée ici
automatiquement — ce n'est pas une action manuelle de l'utilisateur.

### Protection stricte
**Le journal ne peut être ni modifié ni supprimé depuis l'administration, sous
aucune forme, y compris par l'administrateur.** Aucune route API d'écriture autre
que la création automatique par le système ne doit exister pour cette entité.
L'écran associé est en **lecture seule**, avec recherche/filtre (par date, module,
action) mais aucun bouton d'édition ou de suppression nulle part sur cet écran.

## Entités
- `Alerte` (type, règle déclenchante, entité liée, statut vue/active, date)
- `SeuilAlerte` (paramètres : délai péremption, seuil d'écart d'inventaire,
  délai d'échéance facture, etc. — configurables par l'administrateur)
- `JournalActivite` (append-only : date, heure, module, action, ancienne valeur,
  nouvelle valeur)
- `RapportMensuel` (période, données figées au moment de la génération, fichier
  PDF associé)
