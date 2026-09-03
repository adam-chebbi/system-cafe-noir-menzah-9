# Test manuel — Module Gestion des Stocks

Ce document décrit les scénarios de test manuel à exécuter dans l'application (aucun test automatisé n'a été lancé par l'assistant — c'est au développeur de dérouler ces étapes dans le navigateur).

**Prérequis**
- Lancer l'application : `npm run dev`, puis se connecter avec un PIN administrateur.
- Naviguer vers le module **Stock & Pertes** (icône caisses dans la barre latérale/module).
- Tester avec des matières premières créées spécifiquement pour ce test (préfixer les noms par `TEST_`) pour les repérer facilement et les supprimer ensuite.
- Le module a exactement **2 zones fixes** : **Réserve principale** et **Dépôt**. Il n'existe aucune option pour en créer une troisième — c'est volontaire, à ne pas chercher dans l'UI.

---

## 1. Zones fixes & stock par article

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 1.1 | Onglet **État des Stocks** → "Ajouter Matière". Créer `TEST_Farine`, unité `kg`, stock initial : `Réserve principale = 5`, `Dépôt = 20`, seuil minimum `2`, stock cible `30`, coût `1.500 DT/kg`. | La matière apparaît dans la liste avec le détail **"Réserve principale : 5.00 kg • Dépôt : 20.00 kg"** et un total de **25.00 kg**. |
| 1.2 | Ouvrir la fiche de `TEST_Farine` en modification. | Les deux champs de stock par zone sont pré-remplis avec les valeurs saisies (5 et 20), pas un champ unique. |
| 1.3 | Modifier directement le champ "Dépôt" à `18` et enregistrer. | Le total recalculé passe à **23.00 kg** ; le détail par zone reflète bien `Réserve principale : 5 / Dépôt : 18`. |

---

## 2. Mouvements — traçabilité complète (zone, origine, destination, motif, commentaire)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 2.1 | Sur `TEST_Farine`, cliquer "Ajuster Stock" → Entrée, zone **Dépôt**, quantité `10`. Valider. | Un mouvement apparaît dans l'onglet **Historique Mouvements** avec badge de zone **Dépôt**, date/heure, quantité `+10 kg`, motif "Réapprovisionnement manuel". |
| 2.2 | Cliquer "Ajuster Stock" → Sortie, zone **Réserve principale**, quantité `2`. Valider. | Nouveau mouvement `-2 kg`, zone **Réserve principale**, badge distinct (icône orange) des entrées. |
| 2.3 | Dans l'onglet Mouvements, cliquer sur l'icône de correction (↻) d'un mouvement récent, saisir un motif obligatoire. | Une **écriture de correction inverse** est ajoutée à l'historique (jamais de modification/suppression du mouvement original) ; le stock de la zone concernée est rétabli en conséquence. |

---

## 3. Transferts entre zones (liés automatiquement)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.1 | Bouton **"Transférer"** (barre du haut) ou raccourci module. Choisir `TEST_Farine`, sens **Dépôt → Réserve principale**, quantité `5`. Valider. | Confirmation "Transfert enregistré : Dépôt → Réserve principale". Le stock Dépôt diminue de 5, celui de la Réserve principale augmente de 5 ; le **total ne change pas**. |
| 3.2 | Ouvrir l'onglet Mouvements. | **Deux** lignes de mouvement apparaissent pour ce transfert (une par zone), type "Transfert", avec origine/destination affichées (`Dépôt → Réserve principale`) sur chaque ligne — elles sont liées en base par un même identifiant de mouvement jumeau (visible via l'API `/api/stock/movements` : champ `linkedMovementId`). |
| 3.3 | Dans la modale de transfert, cliquer le bouton d'inversion (↔). | Le sens du transfert bascule immédiatement dans l'aperçu (Dépôt/Réserve principale échangés). |

---

## 4. Stock négatif autorisé, avec alerte

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 4.1 | Créer `TEST_Citron`, stock `Réserve principale = 2`, `Dépôt = 0`, seuil `1`. | Créé. |
| 4.2 | "Ajuster Stock" → Sortie, zone Réserve principale, quantité `5` (supérieure au stock disponible). Valider. | La sortie est acceptée (**pas de blocage**) ; le stock de la Réserve principale devient **-3.00 kg**, affiché en rouge dans la liste. |
| 4.3 | Ouvrir la cloche de notifications (en-tête). | Une alerte **"Stock négatif : TEST_Citron"** est présente, avec un lien vers le module Stock. |
| 4.4 | Retourner sur **État des Stocks**. | La carte KPI "Zones en Stock Négatif" affiche un compteur ≥ 1. |
| 4.5 | Transférer `3` depuis le Dépôt (si du stock y est disponible) ou faire une entrée de `3` en Réserve principale pour corriger. | Le stock de la zone repasse à 0 ou au-dessus ; l'alerte ne se régénère pas pour ce même mouvement correctif. |

---

## 5. Coût Moyen Pondéré (CMP)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 5.1 | Créer `TEST_Cafe_CMP`, stock `Réserve principale = 10`, `Dépôt = 0`, coût initial `10.000 DT/kg`. | Valeur de stock affichée : `100.000 DT`. |
| 5.2 | "Ajuster Stock" → Entrée, zone Dépôt, quantité `10`, en réalité utiliser le formulaire d'entrée manuelle avec un coût **différent** — si le formulaire rapide ne permet pas de saisir un coût différent, utiliser **Fournisseurs → Bons de Commande** ou **Facture Fournisseur** en réceptionnant `10 kg` à `20.000 DT/kg` pour `TEST_Cafe_CMP`. | Le coût unitaire (CMP) affiché sur `TEST_Cafe_CMP` devient **15.000 DT/kg** — soit `(10×10 + 10×20) / 20` — et non `20.000` (pas un simple écrasement par le dernier prix reçu). |
| 5.3 | Ouvrir une fiche technique (Produits → Fiches Recettes) utilisant `TEST_Cafe_CMP` comme ingrédient. | Le coût matière et la marge de la recette se recalculent automatiquement avec le nouveau CMP. |

---

## 6. Lots & péremptions

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 6.1 | Créer `TEST_Yaourt`, cocher **"Gérer les lots & péremptions pour ce produit"**, délai d'alerte propre `2` jours. | Créé, badge "Lots" visible à côté du nom dans la liste. |
| 6.2 | "Ajuster Stock" → Entrée, zone Réserve principale, quantité `10`. Le formulaire affiche des champs Lot supplémentaires (car `trackLots` est activé) : saisir un numéro de lot et une date de péremption **dans 1 jour**. Valider. | Mouvement d'entrée créé. |
| 6.3 | Aller dans l'onglet **Lots & Péremptions**. | Le lot apparaît, marqué **"Bientôt périmé"** (badge ambre), avec le nombre de jours restants — car son délai propre (2 j) dépasse le délai réel restant (1 j). |
| 6.4 | Ouvrir la cloche de notifications. | Une alerte **"Péremption proche : TEST_Yaourt"** est présente. |
| 6.5 | Répéter 6.2 avec une date de péremption **dans le passé** (hier). | Le nouveau lot apparaît marqué **"Périmé"** (badge rouge) dans l'onglet Lots, et une alerte "Lot périmé" est générée. |
| 6.6 | Dans l'onglet Lots, cliquer "Archiver" sur un lot. | Le lot disparaît de la liste active et apparaît dans la section repliable "Lots archivés" en bas de page. |
| 6.7 | Cliquer "Délai d'alerte par défaut", changer la valeur globale (ex. `7` jours), enregistrer. | Un produit **sans** délai propre (ex. créer `TEST_Beurre` avec lots activés mais sans délai spécifique) utilise désormais ce nouveau délai global pour déterminer s'il est "bientôt périmé". |

---

## 7. Inventaires — Complet / Par catégorie / Par zone, avec choix manuel

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 7.1 | Cliquer **"Faire l'Inventaire"**. Choisir **"Par Zone"**, sélectionner **Dépôt**. Cliquer "Commencer le Comptage". | La grille de comptage n'affiche que les lignes de la zone Dépôt (une ligne par ingrédient, zone Dépôt uniquement), avec badge de zone visible sur chaque ligne. |
| 7.2 | Modifier la quantité réelle d'au moins 2 lignes pour créer un écart positif et un écart négatif. | L'écart (quantité et valeur DT) se recalcule en direct par ligne, ainsi que l'écart financier total en haut de la modale. |
| 7.3 | Sur une des lignes en écart, **décocher** la case "Ajuster" (elle passe à "Garder théo."). Sur une autre ligne en écart, la laisser cochée. Cliquer **"Valider & Appliquer au Stock"**. | Message de succès. Le stock de la ligne **cochée** est mis à jour à la quantité réelle saisie ; le stock de la ligne **décochée** reste inchangé (valeur théorique conservée). |
| 7.4 | Ouvrir l'onglet **Audits & Inventaires**, cliquer sur l'inventaire qui vient d'être validé. | L'inventaire affiche le statut "Validé", la portée "Zone : Dépôt", et l'écart net global — **y compris pour la ligne non ajustée** (l'écart reste enregistré dans l'historique même si le stock n'a pas été modifié). |
| 7.5 | Refaire un inventaire, cette fois **"Complet"**. | La grille couvre toutes les matières, avec une ligne **par zone** pour chacune (2 lignes par matière si elle a du stock des deux côtés). |
| 7.6 | Refaire un inventaire **"Par Catégorie"**, choisir une catégorie (ex. `fresh`). | Seules les matières de cette catégorie apparaissent, sur les deux zones. |
| 7.7 | Démarrer un inventaire, saisir quelques comptages, puis cliquer **"Enregistrer Brouillon"** au lieu de valider. | Le stock n'est **pas** modifié. L'inventaire apparaît dans l'onglet Audits avec le statut "Brouillon en cours" et un bouton "Reprendre". |
| 7.8 | Cliquer "Reprendre" sur ce brouillon, modifier une valeur, puis "Valider & Appliquer au Stock". | Le brouillon passe au statut "Validé" et les ajustements cochés sont appliqués. |
| 7.9 | Tenter de supprimer un brouillon (icône corbeille dans la liste des audits). | Le brouillon est supprimé sans impact sur le stock. Tenter de supprimer un inventaire **déjà validé** doit être refusé (traçabilité comptable). |

---

## 8. Pertes & ajustements

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 8.1 | Cliquer **"Déclarer Perte"**. Choisir `TEST_Farine`, zone **Réserve principale**, quantité `1`, motif **"Péremption"**, commentaire libre. Valider. | Message "Perte enregistrée et stock déduit". Le stock de la Réserve principale de `TEST_Farine` diminue de 1. |
| 8.2 | Répéter avec les motifs **"Casse"**, **"Consommation interne"**, **"Produit offert"**, **"Erreur de préparation"**, **"Ajustement d'inventaire"**, **"Autre"** sur différentes matières. | Chaque déclaration est acceptée et le motif exact choisi est conservé (vérifier dans l'onglet Registre des Pertes que le motif affiché correspond bien à celui sélectionné, pas toujours le même). |
| 8.3 | Ouvrir l'onglet **Registre des Pertes**. | Un bloc **"Rapport des pertes par motif"** apparaît en haut, avec une carte par motif utilisé indiquant la valeur totale (DT) et le nombre de déclarations, trié par valeur décroissante. |
| 8.4 | Vérifier la carte KPI "Pertes du mois" en haut de page. | Le total correspond à la somme des coûts estimés de toutes les pertes déclarées. |

---

## 9. Alertes — vue d'ensemble

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 9.1 | Créer une matière avec un stock initial égal à son seuil minimum. | Elle apparaît immédiatement dans le filtre "Alertes Seuil Bas" (carte KPI cliquable en haut de l'onglet Inventaire) et génère une alerte "Seuil de stock bas". |
| 9.2 | Cliquer sur une alerte de type "Stock négatif" ou "Seuil bas" dans la cloche de notifications. | Redirige vers l'onglet **État des Stocks**. |
| 9.3 | Cliquer sur une alerte de type "Péremption proche"/"Lot périmé". | Redirige vers l'onglet **Lots & Péremptions**. |

---

## 10. Nettoyage

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 10.1 | Supprimer toutes les matières `TEST_*` créées (bouton corbeille dans État des Stocks). | Suppression réussie si aucune fiche recette active n'en dépend ; sinon message d'erreur explicite. |
| 10.2 | Vérifier que les mouvements, pertes, lots et audits liés aux matières supprimées restent visibles dans leur historique respectif (traçabilité). | L'historique n'est jamais purgé automatiquement à la suppression d'une matière — c'est le comportement attendu. |

---

## Points de vigilance transverses

- **Devise** : tous les montants sont en Dinar Tunisien (DT), affichés à 3 décimales.
- **CMP** : le coût unitaire d'une matière ne doit jamais être un simple remplacement par le dernier prix reçu — vérifier le calcul pondéré (section 5) après au moins deux réceptions à coûts différents.
- **Zone de consommation** : les ventes/recettes déduisent toujours de la **Réserve principale**, jamais du Dépôt. Si une vente échoue à faire baisser le bon stock, vérifier ce point en priorité.
- **Immutabilité de l'historique** : aucune action ne doit permettre de modifier ou supprimer un mouvement, un audit validé, ou une perte déjà enregistrée — seules des écritures correctrices/compensatoires sont créées.
