# Prompt 1 — Cadrage initial et lecture de la documentation

Copie ce texte tel quel dans Google AI Studio juste après avoir importé le dépôt
GitHub du projet.

---

Nous démarrons le développement de "Café Noir Système", une application web de
gestion pour un café, à partir du dépôt que tu viens d'importer. Ce dépôt ne
contient pour l'instant que de la documentation de cadrage, pas de code
applicatif : lis-la entièrement avant de proposer quoi que ce soit.

Lis dans l'ordre : `AGENT.md`, `docs/cahier-des-charges.md`,
`docs/out-of-scope.md`, `docs/crud-matrix.md`, `docs/ux-guidelines.md`, puis
`docs/ui-ux-redesign.md` et `docs/modules/12-gestion-des-tables.md`, puis chaque
fichier de `docs/modules/01` à `11`. Considère `docs/cahier-des-charges.md` comme
la référence contractuelle absolue pour la logique métier, et
`docs/ui-ux-redesign.md` comme la référence absolue pour l'apparence et
l'ergonomie. `docs/modules/12-gestion-des-tables.md` décrit un module
supplémentaire ajouté en dehors du cahier des charges initial — traite-le comme un
module à part entière, mais garde à l'esprit qu'il s'agit d'un ajout et non d'une
fonctionnalité du contrat initial.

Une fois cette lecture faite, propose-moi une stack technique complète et
cohérente pour construire cette application comme une application web
responsive, tablet-first, en français, avec un compte administrateur unique
(pas de multi-utilisateur, pas de gestion de rôles — cahier des charges §1).
Tiens compte des contraintes suivantes dans ton choix :

- L'application doit gérer proprement l'upload et la conservation durable de
  fichiers (photos, PDF de factures, justificatifs, photos de pièces d'identité).
- Elle doit permettre de générer des rapports PDF et des exports Excel/CSV.
- Elle doit permettre de servir à la fois le back-office administrateur et un site
  public + menu digital consultable sans authentification.
- Elle doit permettre de construire une interface avec des animations fluides et
  premium (pour la Navigation Rapide) et un éditeur visuel avec glisser-déposer
  (pour le plan de salle du module Gestion des tables) sans complexité technique
  excessive.
- Elle ne doit inclure aucune dépendance liée à de l'intelligence artificielle ou à
  un service de LLM — la seule brique "intelligente" du projet sera un moteur
  d'OCR classique pour les factures, à mettre en place plus tard.

Une fois la stack validée avec moi, mets en place la structure de base du projet :
organisation des dossiers, conventions de nommage, configuration du linter/
formatteur, gestion des variables d'environnement (avec un fichier d'exemple
documenté, sans jamais y mettre de vrai secret), et un système de migrations de
base de données. Ne construis encore aucun écran ni aucune fonctionnalité métier à
cette étape — nous les aborderons prompt par prompt.

Termine par un résumé, en langage clair, de la stack choisie, de la structure mise
en place, et confirme que rien n'a été construit qui anticiperait ou contredirait
les règles de `docs/ui-ux-redesign.md` ou du cahier des charges.
