# Prompt 10 — Module Dépenses

Copie ce texte tel quel dans Google AI Studio une fois le prompt 9 terminé et
validé.

---

Construis le module Dépenses tel que décrit dans `docs/modules/06-expenses.md`
(cahier des charges §7), intégré à la Navigation Rapide et au système de design
déjà en place.

Points fonctionnels essentiels :

- Catégories initiales préconfigurées (Loyer, STEG, SONEDE, Téléphone/internet,
  Personnel, Entretien, Réparation, Marketing, Fournitures, Transport, Taxes et
  frais, Divers), personnalisables par l'administrateur.
- Chaque dépense comprend montant, date, catégorie, caractère fixe ou variable,
  récurrence optionnelle, mode de paiement, commentaire, justificatif (photo ou
  PDF) simplement uploadé et conservé — sans passer par le module OCR, réservé aux
  factures fournisseurs.
- Une dépense récurrente pré-remplit la suivante à échéance, mais chaque
  occurrence reste confirmée manuellement.
- Correction et annulation tracées, sans suppression définitive.

Peuple ce module avec des **dépenses réelles et variées** couvrant plusieurs
catégories, montants réalistes en dinars tunisiens, sur plusieurs mois si possible
pour que le tableau de bord et les comparaisons de périodes soient démontrables.

Confirme que l'upload de justificatifs valide le type et la taille des fichiers
côté serveur avant stockage.
