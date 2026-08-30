# Prompt 18 — Validation finale UX, non-régression et recette

Copie ce texte tel quel dans Google AI Studio une fois le prompt 17 terminé et
validé. Ce prompt clôture le développement.

---

Fais une passe finale de tests et de recette de l'ensemble de l'application, en
couvrant à la fois la conformité fonctionnelle et la conformité au nouveau langage
visuel.

## Conformité fonctionnelle (non-régression)

- Reprends chaque section du cahier des charges (§2 à §12) une par une et vérifie
  que la fonctionnalité est bien implémentée et utilisable — signale toute
  fonctionnalité manquante ou incomplète.
- Vérifie explicitement, à l'aide de `docs/out-of-scope.md`, qu'aucune
  fonctionnalité hors périmètre n'a été introduite (multi-établissements, comptes
  multiples, rôles/permissions, commande/paiement en ligne, notifications
  SMS/WhatsApp/email, intelligence artificielle quelle qu'elle soit).
- Vérifie spécifiquement que **la refonte visuelle n'a modifié aucune règle
  métier** : les calculs (marges, coût matière, coût moyen pondéré), les statuts
  et leurs transitions, les règles CRUD de `docs/crud-matrix.md`, et les
  permissions restent identiques à ce qui était prévu avant la refonte.
- Mets en place ou complète des tests automatisés pour les logiques critiques :
  calcul des marges et du coût matière, coût moyen pondéré, comportement du stock
  négatif, statuts des commandes/factures fournisseurs, validation obligatoire
  avant intégration OCR, non-suppression des entités transactionnelles,
  immuabilité du journal d'activité, et cohérence des positions de table sur le
  plan après un glisser-déposer.

## Conformité au design (`docs/ui-ux-redesign.md`)

- Vérifie qu'aucun écran de l'application n'utilise une barre de navigation
  latérale permanente, et que la Navigation Rapide reste le seul mécanisme de
  navigation principal, cohérent et animé sur tout le système.
- Vérifie qu'aucun emoji n'apparaît nulle part dans l'interface, et que les icônes
  utilisées sont cohérentes et professionnelles sur tout le système.
- Vérifie le budget de clics de `docs/ux-guidelines.md` pour chaque action du
  quotidien (vente manuelle, scan de facture, mouvement de stock, présence du
  jour, tableau de bord, alertes, dépense, bon de commande, inventaire, sélection
  et modification d'une table) — corrige la navigation si un budget n'est pas
  respecté.
- Vérifie le comportement tablette/desktop/mobile des écrans les plus utilisés au
  quotidien, avec une attention particulière au plan de salle en glisser-déposer.
- Vérifie que le module Gestion des tables respecte bien tous les points de
  `docs/modules/12-gestion-des-tables.md` (espaces multiples, création visuelle de
  table, glisser-déposer, CRUD complet, statuts visuels, panneau contextuel).

## Sécurité

Revérifie, avec un exemple concret pour chacun, les points déjà traités au prompt
17 (contrôle d'accès, validation serveur, uploads, injections, CSRF, fuite de
données sensibles, en-têtes de sécurité, secrets, dépendances, immuabilité du
journal, absence d'IA).

## Rapport final

Termine par un rapport de recette clair et structuré, module par module (y compris
Gestion des tables), avec pour chacun un statut (conforme / à corriger / à
clarifier avec le client) et, pour tout point "à corriger" ou "à clarifier", une
explication en langage simple de ce qui manque ou nécessite une décision de ma
part avant la livraison finale.
