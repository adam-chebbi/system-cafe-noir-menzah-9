# Prompt 11 — Module Employés

Copie ce texte tel quel dans Google AI Studio une fois le prompt 10 terminé et
validé.

---

Construis le module Employés tel que décrit dans `docs/modules/07-employees.md`
(cahier des charges §8), intégré à la Navigation Rapide et au système de design
déjà en place.

Points fonctionnels essentiels :

- Fiche employé complète (nom et prénom, téléphone, poste, date d'entrée, statut
  actif/inactif, photo, salaire, numéro CIN, date de délivrance, copie/photo de la
  CIN).
- Planning et présence saisis exclusivement de façon manuelle (Présent, Absent,
  Congé, Repos, Retard) — aucun dispositif biométrique ni matériel de pointage.
  L'écran de présence du jour doit permettre de marquer rapidement l'état de toute
  l'équipe en quelques gestes, conformément au budget de clics de
  `docs/ux-guidelines.md` et à l'esprit tactile de `docs/ui-ux-redesign.md`.
- Suivi financier par employé (salaire de base, avances, primes, retenues, montant
  payé, date de paiement), alimentant le coût du personnel du tableau de bord.
- Rappel explicite : ce n'est ni un logiciel de paie ni un logiciel de déclaration
  sociale.

Les données de ce module sont sensibles : assure-toi qu'aucune (CIN, salaire,
coordonnées) n'est accessible autrement que via l'administration authentifiée, et
qu'aucun fichier de copie de CIN n'est accessible par une URL devinable sans
authentification.

Peuple ce module avec **une équipe réaliste** pour un café (gérant/barista
principal, un ou deux serveurs, une personne en cuisine/pâtisserie), noms, postes
et salaires plausibles en dinars tunisiens, un planning sur une semaine type,
plusieurs jours de présence déjà saisis avec des états variés, et quelques
mouvements financiers.
