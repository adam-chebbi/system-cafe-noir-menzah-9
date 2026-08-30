# Prompt 9 — Module OCR des factures

Copie ce texte tel quel dans Google AI Studio une fois le prompt 8 terminé et
validé.

---

Construis le module OCR des factures tel que décrit dans
`docs/modules/05-ocr-invoices.md` (cahier des charges §6), intégré à la Navigation
Rapide et au système de design déjà en place. **Utilise un moteur de
reconnaissance de texte classique (OCR), jamais un modèle de langage ni un service
d'intelligence artificielle générative.** Choisis une bibliothèque ou un service
d'OCR "brut" et explique ton choix avant de l'intégrer.

Points fonctionnels essentiels :

- Import d'une facture par photo, JPG, PNG ou PDF, accessible en un seul geste
  depuis n'importe où via la Navigation Rapide.
- Extraction automatique des champs fournisseur, numéro, date, produits,
  quantités, prix unitaires, montant HT, TVA, montant TTC — un champ non détecté
  avec confiance suffisante reste vide et signalé "non détecté" plutôt que rempli
  avec une valeur incorrecte.
- Un écran de vérification humaine obligatoire, document source visible d'un côté,
  champs extraits **entièrement modifiables** de l'autre, avant toute intégration
  en base — conçu avec le nouveau langage visuel pour rester lisible et rapide à
  corriger même sur tablette.
- Possibilité de corriger, supprimer ou ajouter manuellement une ligne produit.
- Mécanisme de correspondance entre libellé fournisseur et article existant, avec
  recherche approximative simple par proximité de texte (pas de similarité
  sémantique par IA), réutilisable automatiquement pour les prochaines factures du
  même fournisseur.
- Un unique bouton "Valider" déclenchant l'intégration définitive — tant qu'il n'a
  pas été cliqué, rien n'est écrit en base côté factures.
- Conservation systématique et durable du fichier original, toujours accessible
  depuis la fiche facture correspondante.

Teste ce module avec **au moins deux photos ou PDF de factures fournisseurs
réalistes**, cohérentes avec les fournisseurs déjà créés au prompt précédent, y
compris si possible un cas avec une mention manuscrite ou une qualité d'image
imparfaite, pour vérifier l'extraction, la correction et la validation de bout en
bout.

Termine en confirmant explicitement qu'aucun appel à une API d'intelligence
artificielle générative ou de LLM n'a été utilisé dans ce module.
