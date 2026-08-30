# Module 10 — Intégration initiale & Formation (cahier des charges §11)

Ce "module" est surtout un processus, pas un écran applicatif — mais l'application
doit **faciliter** cette intégration pour rester cohérente avec l'objectif
"accessible à un non-technicien".

## Données initiales à intégrer (après livraison technique)
Menu, Produits et prix, Catégories, Variantes et suppléments, Ingrédients et
recettes, Stocks initiaux, Fournisseurs actifs, Employés actifs, Seuils et
paramètres disponibles.

### Implication pour le développement
Prévoir, pour chaque entité listée ci-dessus, un moyen d'import en masse simple et
sûr (formulaire d'ajout un par un suffit pour un volume raisonnable, mais un import
Excel/CSV — sur le même modèle que l'import des ventes, §2.2 — est fortement
recommandé au minimum pour : Produits, Ingrédients/Recettes, Stocks initiaux,
Fournisseurs). Chaque import suit le même patron que module 1 : aperçu ligne par
ligne avant confirmation, jamais d'écriture directe sans validation humaine.

## Historique non repris (§11)
Anciennes ventes, anciennes factures, anciennes dépenses, autres historiques
passés : **pas de fonctionnalité de reprise/migration à construire.** Si
l'utilisateur veut conserver une trace du passé, cela reste hors périmètre V1 (à
gérer en dehors de l'application, par exemple en conservant les anciens fichiers).

## Responsabilité des données
Café Noir reste responsable de l'exactitude des informations transmises — aspect
contractuel, pas une fonctionnalité à coder, mais cela justifie que **tous les
écrans de saisie initiale passent aussi par le principe aperçu + confirmation**
(§ux-guidelines) pour que l'utilisateur puisse vérifier ce qu'il importe.

## Formation
Formation initiale d'environ 2 heures + guide de prise en main. Conséquence pour le
produit : privilégier des écrans auto-explicatifns (labels clairs, infobulles
courtes si nécessaire) plutôt que de compter sur une formation longue —
l'application doit rester utilisable même longtemps après la session de 2h,
sans redocumentation externe indispensable pour les tâches du quotidien (vente,
stock, présence).
