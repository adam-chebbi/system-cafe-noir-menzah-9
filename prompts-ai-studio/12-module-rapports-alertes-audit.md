# Prompt 12 — Module Rapports, Alertes & Traçabilité

Copie ce texte tel quel dans Google AI Studio une fois le prompt 11 terminé et
validé.

---

Construis le module Rapports, Alertes & Traçabilité tel que décrit dans
`docs/modules/08-reports-alerts-audit.md` (cahier des charges §9), intégré à la
Navigation Rapide et au système de design déjà en place. Ce module s'appuie sur
tous les modules précédents : relie-toi à leurs données réelles plutôt que de
recréer des exemples séparés.

Points fonctionnels essentiels :

- Bouton d'export Excel et CSV sur chaque liste pertinente déjà construite
  (ventes, stock, fournisseurs/factures, dépenses, employés, pertes, inventaires).
- Rapport mensuel avec tous les indicateurs prévus par le cahier des charges, avec
  un aperçu à l'écran identique au contenu du PDF téléchargeable.
- Toutes les règles d'alertes prévues (stock faible, rupture, stock négatif,
  péremption proche, produit périmé, facture OCR à vérifier, facture fournisseur à
  échéance, écart de stock important, marge sous l'objectif), comme de simples
  comparaisons à des seuils configurables — aucun modèle prédictif ni composant
  d'IA. Alertes affichées uniquement dans la plateforme, jamais par SMS/WhatsApp/
  email.
- Le journal d'activité : chaque création, modification, correction ou annulation
  déjà réalisée par les modules précédents doit écrire automatiquement une entrée
  avec date, heure, utilisateur, module, action, ancienne et nouvelle valeur —
  vérifie et corrige si besoin les modules précédents pour qu'ils écrivent
  effectivement dans ce journal.
- Le journal d'activité doit être structurellement impossible à modifier ou
  supprimer depuis l'application, y compris par l'administrateur.

Présente les alertes avec l'icône "cloche" persistante de l'en-tête et une liste
claire, et le journal d'activité en lecture seule avec recherche/filtre, cohérent
avec le système de design.

Vérifie que les alertes et le journal se déclenchent correctement sur les
**données réelles déjà saisies** dans les modules précédents (par exemple fais
baisser un stock sous son seuil pour vérifier l'alerte) plutôt que d'inventer un
nouveau jeu de données isolé.

Termine par une démonstration concrète que le journal d'activité ne peut être
modifié ni supprimé par aucun moyen depuis l'interface.
