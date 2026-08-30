# Module 4 — Fournisseurs, Achats & Factures (cahier des charges §5)

## 4.1 Fournisseurs (§5.1)

### Champs de la fiche fournisseur
Nom / raison sociale, Matricule fiscal, Téléphone, WhatsApp (numéro, pas
d'intégration de messagerie — juste un champ de contact), Email, Adresse, Contact
principal, Notes libres.

### Relation produit ↔ fournisseurs
Un produit/ingrédient peut être lié à **plusieurs fournisseurs**. Sur la fiche
produit/ingrédient, afficher la liste des fournisseurs associés avec leur dernier
prix connu.

### Historique des prix d'achat
Conservé automatiquement : chaque réception/facture validée qui mentionne un prix
pour un article/fournisseur donné vient alimenter un historique consultable
(courbe ou tableau simple "prix d'achat dans le temps").

## 4.2 Commandes fournisseurs (§5.2)

### Statuts
Brouillon → Commandée → Partiellement reçue → Reçue, ou Annulée à tout moment
avant réception complète.

### Formulaire de commande
`Choisir fournisseur → Ajouter lignes (article + quantité + prix attendu) →
Aperçu (total estimé) → Confirmer ("Enregistrer en brouillon" ou "Envoyer la
commande" qui passe le statut à "Commandée")`.

### Réceptions multiples
Une commande peut être réceptionnée en plusieurs fois (livraisons partielles).
Chaque réception : `Sélectionner la commande → Indiquer les quantités reçues par
ligne (peut différer de la quantité commandée) → Lot/péremption si applicable
(§4.5) → Aperçu → Confirmer`.

### Impact sur le stock
La validation d'une réception **augmente automatiquement** le stock de la zone
choisie (mouvement de stock de type "entrée" généré automatiquement, visible dans
l'historique des mouvements) et met à jour le CMP de l'article et l'historique de
prix.

## 4.3 Factures fournisseurs (§5.3)

### Rattachement
Une facture peut être **liée à une commande** (pré-remplissage des lignes depuis la
commande/réception) ou **saisie librement, sans commande** (ex: achat ponctuel).

### Champs
Fournisseur, Numéro, Date, Échéance, Montant HT, TVA, Montant TTC, Montant payé,
Mode de paiement.

### Statuts
Non payée / Partiellement payée / Payée — dérivés automatiquement du Montant payé
vs Montant TTC, mais l'utilisateur doit pouvoir enregistrer un paiement partiel
explicitement (voir écran de paiement ci-dessous).

### Échéances
Liste/alerte des factures dont l'échéance approche (paramétrable, voir §9.3) —
affichée dans le tableau de bord et dans les alertes.

### Écran de paiement
`Sélectionner la facture → Montant payé (peut être partiel) → Mode de paiement →
Date de paiement → Aperçu → Confirmer`. Le statut de la facture se met à jour
automatiquement.

### Lien avec le module OCR (§6)
Une facture peut être créée soit manuellement (formulaire ci-dessus), soit via le
scan/import + validation OCR (voir `05-ocr-invoices.md`) — dans les deux cas, elle
aboutit à la même entité `FactureFournisseur` avec les mêmes champs et le même
écran de consultation/paiement.

## Entités
- `Fournisseur`
- `PrixAchatHistorique` (article, fournisseur, prix, date)
- `Commande` (statut, fournisseur, lignes)
- `LigneCommande` (article, quantité commandée, prix attendu)
- `Reception` (liée à une commande, peut être multiple)
- `LigneReception` (article, quantité reçue, lot/péremption optionnels)
- `FactureFournisseur` (statut, montants, échéance, fichier source si issue d'OCR)
- `PaiementFacture`
