# Module 6 — Dépenses (cahier des charges §7)

## Types
Dépenses fixes et Dépenses variables — un simple champ "Caractère" à choisir sur
chaque dépense (pas deux modules séparés).

## Catégories initiales (à préconfigurer au premier lancement)
Loyer, STEG, SONEDE, Téléphone / internet, Personnel, Entretien, Réparation,
Marketing, Fournitures, Transport, Taxes et frais, Divers.

Personnalisables par l'administrateur (renommer, ajouter, désactiver une catégorie
— voir `crud-matrix.md` pour les règles de suppression conditionnelle si la
catégorie est déjà utilisée).

## Champs d'une dépense
Montant, Date, Catégorie, Caractère (fixe/variable), Récurrence (optionnel — ex:
mensuelle pour le loyer, avec possibilité de générer automatiquement les
occurrences futures ou simplement de dupliquer facilement une dépense récurrente),
Mode de paiement, Commentaire, Justificatif (photo ou PDF, upload simple —
**pas d'OCR sur les justificatifs de dépenses**, l'OCR du cahier des charges (§6)
concerne uniquement les factures fournisseurs).

## Formulaire — flux
`Montant + Catégorie → Date + caractère fixe/variable → Récurrence (optionnel) →
Mode de paiement + commentaire → Justificatif (optionnel, upload) → Aperçu →
Confirmer`. Accessible en 2 taps depuis n'importe où.

## Récurrence — comportement V1 recommandé
Simple : cocher "Dépense récurrente" + fréquence (mensuelle/hebdomadaire) crée une
règle qui pré-remplit une nouvelle dépense à échéance (l'utilisateur confirme
toujours manuellement chaque occurrence — pas de génération automatique invisible,
pour rester cohérent avec le principe "aperçu + validation" partout).

## Correction / Annulation
Comme toutes les entités transactionnelles : correction tracée, annulation tracée,
jamais de suppression définitive (voir `crud-matrix.md`).

## Entités
- `CategorieDepense`
- `Depense` (montant, date, catégorie, caractère, récurrence, mode de paiement,
  commentaire, justificatif, statut)
