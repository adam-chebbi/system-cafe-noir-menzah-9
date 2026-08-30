# Prompt 15 — Outils d'intégration des données initiales

Copie ce texte tel quel dans Google AI Studio une fois le prompt 14 terminé et
validé.

---

Construis les outils d'intégration des données initiales décrits dans
`docs/modules/10-onboarding-training.md`, en lien avec le cahier des charges §11.
Lors du vrai démarrage chez le client, l'administrateur devra pouvoir faire entrer
dans le système : le menu, les produits et prix, les catégories, les variantes et
suppléments, les ingrédients et recettes, les stocks initiaux, les fournisseurs
actifs, les employés actifs, les seuils/paramètres disponibles, et l'agencement
initial des tables (espaces, tables, positions) — sans reprise des anciens
historiques de ventes, factures ou dépenses.

Mets en place, pour les entités qui s'y prêtent (au minimum produits,
ingrédients/recettes, stocks initiaux, fournisseurs), un import Excel/CSV en masse
suivant le même principe que l'import des ventes : aperçu ligne par ligne avec
colonnes reconnues et erreurs signalées, correction possible avant import, puis
confirmation explicite affichant le nombre de lignes importées/ignorées. Pour les
autres entités (employés, seuils, plan de tables), les formulaires/interfaces déjà
construits dans les modules précédents suffisent s'ils restent rapides à utiliser
en série.

Prépare un modèle de fichier d'exemple (gabarit Excel/CSV) pour chaque import en
masse, avec des **données déjà réelles et plausibles pour Café Noir** en exemple
dans le gabarit.

Utilise toi-même ces outils pour vérifier qu'un administrateur non technique
pourrait démarrer le système à partir de zéro avec un jeu de données de démarrage
réaliste et complet, en réutilisant et complétant les données déjà saisies dans
les prompts précédents plutôt qu'en recommençant depuis rien.
