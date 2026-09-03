# Test manuel — Module Produits, Recettes & Marges

Ce document décrit les scénarios de test manuel à exécuter dans l'application (aucun test automatisé, aucun test Playwright, aucune validation n'a été effectuée par l'assistant — c'est au développeur de dérouler ces étapes).

**Prérequis**
- Lancer l'application : `npm run dev` puis se connecter (PIN admin par défaut `1234` ou `0000` si aucun utilisateur n'est configuré).
- Naviguer vers **Catalogue & Fiches Techniques** (menu Produits) pour les sections 1 à 4, et vers **Stock → Inventaire** pour la section 6.
- Il est recommandé de tester avec des ingrédients/produits créés spécifiquement pour ce test (préfixer les noms par `TEST_`) afin de les repérer facilement et de pouvoir les identifier en cas de nettoyage ultérieur.

---

## 1. Catégories & Sous-catégories (profondeur max 2 niveaux)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 1.1 | Ouvrir **Catalogue → Catégories**, créer une catégorie `TEST_Boissons` (pas de catégorie parente sélectionnée). | La catégorie apparaît dans la liste, au premier niveau. |
| 1.2 | Rouvrir la gestion des catégories, créer une nouvelle entrée `TEST_Cafés Chauds` en choisissant `TEST_Boissons` comme catégorie parente. | La sous-catégorie apparaît **indentée sous** `TEST_Boissons` dans la liste, avec son propre compteur d'articles. |
| 1.3 | Dans le formulaire de création de catégorie, vérifier le menu déroulant "catégorie parente" : seules les catégories de **premier niveau** doivent y figurer (pas `TEST_Cafés Chauds`). | `TEST_Cafés Chauds` n'apparaît pas comme choix de parent possible — impossible de créer une sous-sous-catégorie depuis l'UI. |
| 1.4 | Tenter de créer une sous-catégorie via l'API directement avec `parentId` pointant vers `TEST_Cafés Chauds` (ex. via un outil comme Postman/curl sur `POST /api/categories`). | La requête est rejetée avec une erreur explicite : *"Impossible de créer plus de 2 niveaux..."*. |
| 1.5 | Créer un produit `TEST_Espresso` dans la catégorie `TEST_Boissons`, sous-catégorie `TEST_Cafés Chauds`. | Le produit est listé avec le libellé `TEST_Boissons › TEST_Cafés Chauds` dans sa fiche et dans la liste. |
| 1.6 | Dans la barre de filtres du catalogue, cliquer sur l'onglet `TEST_Boissons`. | Une ligne de puces "Sous-catégorie" apparaît sous la barre, avec `TEST_Cafés Chauds` et son compteur. Cliquer dessus filtre la liste à `TEST_Espresso` uniquement. |
| 1.7 | Tenter de supprimer la catégorie `TEST_Boissons` (qui a encore la sous-catégorie et le produit rattachés). | Suppression refusée avec message explicite (sous-catégorie(s) rattachée(s)). |
| 1.8 | Supprimer `TEST_Espresso`, puis `TEST_Cafés Chauds`, puis `TEST_Boissons` dans cet ordre. | Chaque suppression réussit une fois les dépendances retirées. |

---

## 2. Fiche produit complète

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 2.1 | Créer un nouveau produit `TEST_Cappuccino` : renseigner nom, description, photo (upload ou URL), prix de vente, catégorie, sous-catégorie (optionnelle), disponibilité, poste de préparation. | Le produit est créé et visible dans le catalogue avec tous les champs saisis. |
| 2.2 | Depuis la fiche produit, ajouter des **variantes/suppléments** (options), ex. "Taille" (Petit/Grand) et "Extra shot" avec un supplément de prix. | Les options sont enregistrées et visibles/éditables sur la fiche. |
| 2.3 | Basculer la disponibilité du produit (bouton "En vente" / "Masqué"). | Le badge de disponibilité change immédiatement dans la liste et sur la fiche. |
| 2.4 | Vérifier que la fiche produit affiche une carte "Fiche Technique & Coûts" avec un bouton "Créer Fiche" tant qu'aucune recette n'est associée. | Le message "Aucune fiche technique liée" est visible avant création de la recette (section 3). |

---

## 3. Fiches techniques / Recettes — ingrédients, unités, sous-recettes

### 3.1 Recette simple avec conversion d'unité

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.1.1 | Dans **Stock**, créer un ingrédient `TEST_Lait` : unité de stock **L** (litre), coût `2.500 DT/L`, stock initial `10`. | Ingrédient créé. |
| 3.1.2 | Ouvrir la fiche technique de `TEST_Cappuccino`, ajouter l'ingrédient `TEST_Lait`. Choisir l'**unité recette "ml"** (différente de l'unité de stock "L") et saisir une quantité de `180` (valeur unique, pas de plage). | Le badge d'affichage montre `≈180 mL`. Une note apparaît : *"Stock en L — calcul interne en L · affiché toujours en ml"*. Le coût de ligne affiché doit correspondre à `0.180 × 2.500 = 0.450 DT` (conversion mL → L automatique). |
| 3.1.3 | Modifier la quantité pour une **plage** : min `170`, max `200` (toujours en ml). | L'affichage devient `≈170–200 mL`. Le coût de ligne change selon le mode de calcul de plage actif (voir 3.1.4). |
| 3.1.4 | Ouvrir le panneau "Mode de calcul pour les plages" (dans la fiche technique) et basculer entre **Borne haute**, **Médiane**, **Borne basse**. | Le coût de ligne et le coût matière total se recalculent immédiatement selon le mode choisi (borne haute = le plus prudent/cher, borne basse = le moins cher). |
| 3.1.5 | Enregistrer la fiche technique. | Le produit `TEST_Cappuccino` affiche désormais "Fiche OK" dans la liste catalogue, avec Coût Matière / Marge Brute / Marge Réelle / Marge Cible visibles. |

### 3.2 Sous-recettes (fiche technique utilisée comme composant)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.2.1 | Créer un ingrédient `TEST_Sucre` (unité `kg`, coût `2.000 DT/kg`, stock `10`). | Ingrédient créé. |
| 3.2.2 | Créer un produit `TEST_Sirop Base` (prix indicatif `1.000 DT`, peu importe la catégorie). Ouvrir sa fiche technique : rendement `10` portions, ajouter `TEST_Sucre` en quantité `0.5 kg` pour tout le lot. Enregistrer. | Coût Matière ≈ `1.000 DT` pour 10 portions, soit `0.100 DT/portion`. |
| 3.2.3 | Créer un produit `TEST_Latte Signature` (prix `5.000 DT`). Ouvrir sa fiche technique, cliquer sur **"Sous-recette"** (à côté de "Ingrédient") pour ajouter une ligne. | Un sélecteur de sous-recette apparaît, listant les fiches techniques existantes (dont `TEST_Sirop Base`), à l'exclusion de `TEST_Latte Signature` lui-même. L'unité est fixée à "portion(s)" (non modifiable). |
| 3.2.4 | Sélectionner `TEST_Sirop Base` comme sous-recette, quantité `1` portion. Enregistrer. | Coût matière de `TEST_Latte Signature` ≈ `0.100 DT` (1 portion × coût/portion de la sous-recette). La ligne affiche l'icône "sous-recette" (calque) et le texte *"coût par portion recalculé automatiquement"*. |
| 3.2.5 | **Test anti-cycle** : ouvrir la fiche technique de `TEST_Sirop Base` et essayer d'y ajouter `TEST_Latte Signature` comme sous-recette. | `TEST_Latte Signature` n'apparaît **pas** dans la liste des sous-recettes disponibles (protection côté client). Si vous forcez l'appel API directement, la sauvegarde est refusée avec une erreur explicite de cycle. |
| 3.2.6 | **Test de suppression protégée** : essayer de supprimer la fiche technique de `TEST_Sirop Base` tant que `TEST_Latte Signature` en dépend. | Suppression refusée avec message indiquant que la fiche est utilisée comme sous-recette ailleurs. |

### 3.3 Recalcul automatique du coût matière

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.3.1 | Noter le Coût Matière actuel de `TEST_Sirop Base` et de `TEST_Latte Signature`. | — |
| 3.3.2 | Aller dans **Stock**, modifier le coût unitaire de `TEST_Sucre` (ex. de `2.000` à `4.000 DT/kg`) et enregistrer. | — |
| 3.3.3 | Retourner sur la fiche technique de `TEST_Sirop Base` (ou recharger le catalogue). | Le Coût Matière a doublé automatiquement, **sans avoir rouvert/re-enregistré** la fiche manuellement. |
| 3.3.4 | Vérifier la fiche technique de `TEST_Latte Signature` (qui utilise `TEST_Sirop Base` comme sous-recette). | Son coût matière a **également** été recalculé en cascade (le coût par portion de la sous-recette a changé), sans intervention manuelle sur cette fiche. |
| 3.3.5 | Répéter le test en réceptionnant du stock (Stock → Ajuster Stock → Entrée) pour `TEST_Sucre` avec un nouveau coût unitaire différent. | Même comportement : recalcul automatique en cascade déclenché par la réception de stock. |

---

## 4. Marge cible vs marge réelle

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 4.1 | Ouvrir la fiche technique de `TEST_Latte Signature`. Repérer les 4 indicateurs : Coût Matière, Prix Vente TTC, **Marge Réelle**, **Marge Cible**. | La Marge Réelle est un pourcentage calculé automatiquement (non éditable). La Marge Cible est un champ numérique éditable. |
| 4.2 | Saisir une Marge Cible **inférieure** à la marge réelle actuelle (ex. si la marge réelle est ~98%, saisir `50`). | Le badge de comparaison affiche **"Dépassée"** (marge réelle > marge cible). |
| 4.3 | Saisir une Marge Cible **supérieure** à la marge réelle actuelle (ex. `99.9`). | Le badge affiche **"En dessous"**. |
| 4.4 | Saisir une Marge Cible strictement égale à la marge réelle actuelle (arrondie à 1 décimale). | Le badge affiche **"Atteinte"**. |
| 4.5 | Enregistrer avec une Marge Cible de `70`. Rouvrir la fiche. | La Marge Cible saisie (`70`) est bien conservée telle quelle — elle n'est **jamais** écrasée par la valeur calculée automatiquement, même après plusieurs recalculs de coût matière (cf. section 3.3). |
| 4.6 | Retourner sur la fiche produit (`TEST_Latte Signature`) dans le catalogue (panneau de droite, hors édition). | Les mêmes 4 indicateurs (Coût Matière, Marge Brute, Marge Réelle, Marge Cible + badge de comparaison) sont visibles en lecture seule, cohérents avec ce qui a été saisi dans la fiche technique. |

---

## 5. CSV — catégories/sous-catégories

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 5.1 | Depuis le catalogue, cliquer sur **Import** puis **Modèle CSV**. | Le fichier téléchargé contient une colonne `SousCategorie` (entre `Categorie` et `Prix`). |
| 5.2 | Éditer le CSV pour ajouter une ligne produit avec une catégorie et une sous-catégorie qui n'existent pas encore, puis l'importer. | Le produit est créé, la catégorie et la sous-catégorie sont créées automatiquement et correctement rattachées (sous-catégorie liée à la bonne catégorie parente). |
| 5.3 | Importer un CSV à l'ancien format (sans colonne `SousCategorie`, 9 colonnes). | L'import reste fonctionnel (rétrocompatibilité) — les produits sont importés sans sous-catégorie. |

---

## 6. Consommation théorique & comparaison à l'inventaire physique

Cette section vérifie que le système calcule la consommation théorique des ingrédients à partir des **ventes réelles** et des **fiches techniques** (y compris sous-recettes), puis l'utilise pour établir un **stock théorique** indépendant, comparable au stock physique constaté en inventaire.

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 6.1 | Aller dans **Stock → Audits & Inventaires**, cliquer sur **"Faire l'Inventaire"** (nouvel audit, pas de brouillon existant). | Pour chaque ingrédient, une ligne "Stock théorique : X" s'affiche. Sous cette ligne, un texte explique la source : soit *"Reconstruit depuis l'inventaire du [date] + ventes réelles"* (si un inventaire validé existe déjà pour cet ingrédient), soit *"Aucun inventaire validé antérieur — stock ledger courant utilisé comme référence"* (en orange, si c'est le tout premier inventaire). |
| 6.2 | Sans rien changer, valider cet inventaire (compter chaque ingrédient à la valeur pré-remplie). | L'inventaire est validé, l'écart net est à 0.000 DT (le stock théorique = ce qui a été compté, par construction du pré-remplissage). |
| 6.3 | Vendre 2 ou 3 `TEST_Latte Signature` via le POS (Caisse → composer une commande → encaisser). | La vente déduit le stock des ingrédients bruts (`TEST_Sucre` via la sous-recette `TEST_Sirop Base`) — vérifier dans **Stock → État des Stocks** que `TEST_Sucre` a bien diminué (`0.01 kg` de sucre par latte vendu, compte tenu du rendement de la recette de base). |
| 6.4 | Retourner sur **Stock → Faire l'Inventaire** (nouvel audit). | Cette fois, la ligne de `TEST_Sucre` indique *"Reconstruit depuis l'inventaire du [date de l'étape 6.2] + ventes réelles"*. Le stock théorique pré-rempli doit correspondre exactement au stock ledger courant affiché dans État des Stocks (car aucune erreur de déduction ne s'est produite entre-temps) — si un écart apparaît ("écart avec le stock ledger : ..."), cela signalerait une anomalie dans la déduction de stock à investiguer. |
| 6.5 | Compter physiquement (ou simuler) une quantité **différente** du stock théorique pour `TEST_Sucre` (ex. simuler une perte non déclarée : saisir 0.05 kg de moins que la valeur théorique). | L'écart (différence + valeur) s'affiche en rouge dans la ligne, et dans le total "Écart financier". Valider l'inventaire applique cet écart au stock réel (ajustement `adjustment_inventory`). |
| 6.6 | Consulter l'endpoint `GET /api/stock/theoretical-consumption?startDate=AAAA-MM-JJ&endDate=AAAA-MM-JJ` (avec les dates couvrant les ventes de test) directement dans le navigateur ou via curl. | La réponse liste, par ingrédient, la quantité théorique consommée, sa valeur, et le détail par produit vendu (`productBreakdown`). Elle inclut aussi `skippedSalesLines` et `skippedNoRecipeCount` pour signaler les lignes de vente ignorées faute de produit identifiable ou de fiche technique — jamais de valeur inventée. |
| 6.7 | Consulter `GET /api/stock/theoretical-stock`. | Pour chaque ingrédient, retrouver `referenceSource` (`audit` ou `no_audit_baseline`), `referenceStock`, `theoreticalConsumptionSinceReference`, `theoreticalStock`, `currentLedgerStock` et `ledgerDrift`. Vérifier que `ledgerDrift` est à 0 pour les ingrédients sans anomalie, et reflète l'écart volontairement introduit à l'étape 6.5 le cas échéant (une fois le nouvel audit validé, celui-ci redevient la référence et l'écart est absorbé). |

---

## 7. Nettoyage

Une fois les tests terminés, supprimer les entités de test dans cet ordre (les protections de suppression empêchent un ordre incorrect) :
1. Fiches techniques : `TEST_Latte Signature` puis `TEST_Sirop Base`.
2. Produits : `TEST_Latte Signature`, `TEST_Sirop Base`, `TEST_Cappuccino`, `TEST_Espresso` (si encore présent).
3. Ingrédients : `TEST_Lait`, `TEST_Sucre`.
4. Catégories/sous-catégories créées en section 1 (si pas déjà supprimées).

Les inventaires validés créés pendant les tests (section 6) **ne peuvent pas être supprimés** (traçabilité comptable) — c'est un comportement normal du système, à garder à l'esprit si ce test est exécuté sur une base de données de production plutôt que sur un environnement de test dédié.
