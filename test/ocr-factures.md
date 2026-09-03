# Test manuel — Module OCR des Factures

Ce document décrit les scénarios de test manuel à exécuter dans l'application (aucun test automatisé n'a été lancé par l'assistant — c'est au développeur de dérouler ces étapes dans le navigateur).

**Prérequis**
- Lancer l'application : `npm run dev`, puis se connecter avec un PIN administrateur.
- Naviguer vers **Fournisseurs & Factures OCR** → bouton **"Scanner Facture (OCR)"** (badge OCR), ou via le raccourci module "Scan Facture".
- Préparer 2-3 fichiers de test représentant une facture fournisseur : idéalement une photo/scan (JPG ou PNG), un PDF natif (texte sélectionnable) et, si possible, un PDF scanné (image). Une facture réelle floutée/anonymisée ou un document de test généré convient.
- Ce module s'appuie sur les modules Stock (zones) et Fournisseurs déjà en place — toute donnée validée y apparaît ensuite.

---

## 1. Import — formats acceptés

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 1.1 | Ouvrir la modale OCR. Vérifier les badges de formats affichés sur la zone de dépôt. | "Images : PNG, JPG, WEBP", "PDF : Texte natif & Scanné", "Word : DOCX", "Max 20 Mo" sont visibles. |
| 1.2 | Glisser-déposer une photo JPG de facture. | Une barre de progression avec message d'étape ("Chargement...", OCR, etc.) s'affiche, mention "Traitement 100% sécurisé et local... sans appel à un service tiers." | 
| 1.3 | Recommencer en cliquant sur la zone pour ouvrir le sélecteur de fichiers, choisir un PNG. | Fonctionne de façon identique au glisser-déposer. |
| 1.4 | Importer un PDF texte natif (facture générée numériquement, texte sélectionnable dans un lecteur PDF classique). | Le traitement est quasi instantané (pas d'étape OCR longue) car le texte est extrait directement de la structure du PDF. |
| 1.5 | Importer un PDF scanné (image, sans couche texte). | Le traitement passe par la reconnaissance optique (plus long, barre de progression visible), puis aboutit à l'étape 2. |
| 1.6 | Tenter d'importer un fichier non supporté (ex. `.xlsx` ou `.zip`). | Message d'erreur clair en français expliquant les formats acceptés ; aucun blocage de l'application. |
| 1.7 | Tenter d'importer un fichier de plus de 20 Mo (si disponible). | Message d'erreur explicite mentionnant la taille maximale et la taille réelle du fichier. |

---

## 2. Extraction — détecté vs à vérifier

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 2.1 | Une fois l'analyse terminée, observer l'écran "Prévisualisation & Correction" (étape 2/3 du bandeau en haut). | Vue partagée : document original à gauche (avec zoom, rotation, loupe d'inspection x2.8, bascule image originale/binarisée), formulaire éditable à droite. |
| 2.2 | Observer chaque champ d'en-tête (Fournisseur, N° Facture, Date d'émission, Date d'échéance). | Chacun affiche un badge de confiance distinct : vert "Élevé", ambre "Moyen", ou rouge clignotant "À vérifier" — jamais neutre/absent. |
| 2.3 | Observer les montants Sous-Total HT, Montant TVA, Total TTC. | Chacun affiche désormais également son propre badge de confiance (élevé/moyen/à vérifier), au même titre que les autres champs. |
| 2.4 | Observer chaque ligne d'article. | Un badge de confiance est visible à côté de "Ligne d'article" pour chaque ligne. |
| 2.5 | Cliquer sur la loupe (icône œil "Loupe") puis déplacer la souris sur le document. | Une loupe circulaire grossissante (x2.8) suit le curseur, permettant de vérifier un chiffre illisible sans quitter l'écran. |
| 2.6 | Cliquer sur "Voir le texte brut intégral" (icône document). | Une fenêtre affiche le texte brut extrait, avec bouton copier — utile pour l'audit en cas de doute. |

---

## 3. Correction obligatoire avant intégration

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.1 | Modifier manuellement le Fournisseur détecté (sélectionner un autre dans la liste). | Le badge de confiance de ce champ passe immédiatement à "Élevé" (la correction manuelle est considérée fiable). |
| 3.2 | Modifier le N° de Facture, les dates. | Les champs sont directement éditables, aucune restriction. |
| 3.3 | Sur une ligne d'article, corriger la désignation, la quantité, le prix unitaire, la TVA. | Le "Total HT" de la ligne, puis le Sous-Total/TVA/Total TTC globaux (si non forcés manuellement) se recalculent en direct. |
| 3.4 | Cocher "Forcer manuellement les totaux" et saisir des montants différents. | Les 3 champs de totaux deviennent éditables et ne sont plus recalculés automatiquement à partir des lignes ; leurs badges de confiance disparaissent (la saisie manuelle prime). |
| 3.5 | Utiliser "Scinder cette ligne en deux" puis "Fusionner avec la ligne suivante" sur une ligne. | Les lignes se divisent/recombinent correctement avec recalcul des quantités et montants. |
| 3.6 | Cliquer "Ajouter une ligne", puis "Supprimer" sur une ligne existante. | Fonctionne ; impossible de supprimer la dernière ligne restante (message d'avertissement). |
| 3.7 | Cliquer "Continuer vers la Confirmation" sans avoir validé, puis "Retour aux modifications" depuis l'étape 3. | Navigation libre entre les étapes 2 et 3, aucune donnée n'est perdue. |
| 3.8 | Fermer la modale (croix) avant d'avoir cliqué sur "Valider & Enregistrer Définitivement", à n'importe quelle étape. | Aucune facture n'est créée, aucun stock n'est modifié — confirmé en vérifiant l'onglet Factures et le stock de l'ingrédient testé. |

---

## 4. Rattachement manuel d'un produit (libellé qui ne correspond pas)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 4.1 | Repérer une ligne dont le champ "Ingrédient de stock lié" affiche "-- Non rattaché --" (bordure ambre) — ou en créer une manuellement (section 3.6) avec une désignation qui ne correspond à aucun ingrédient existant. | Le sélecteur affiche clairement l'état "non rattaché" (couleur ambre). |
| 4.2 | Cliquer sur le sélecteur d'ingrédient. | Un menu déroulant s'ouvre avec un champ de recherche, une liste de suggestions classées par ressemblance avec le texte de la ligne (pourcentage affiché), et un bouton "Créer un nouvel ingrédient" en bas. |
| 4.3 | Taper quelques lettres dans la recherche. | La liste se filtre en direct sur le nom des ingrédients. |
| 4.4 | Sélectionner un ingrédient existant dans la liste. | Le sélecteur passe en bordure verte, affiche l'ingrédient choisi ; un badge "Choix manuel" apparaît en dessous, avec une case "Mémoriser pour [Fournisseur]" cochée par défaut. |
| 4.5 | Vérifier l'aperçu "Impact stock" sous la ligne. | Affiche la quantité qui sera ajoutée dans l'unité de stock de l'ingrédient choisi. |
| 4.6 | Cliquer sur "Créer un nouvel ingrédient" depuis le sélecteur d'une ligne non rattachée. | Une modale de création rapide s'ouvre, pré-remplie avec le nom de la ligne, l'unité et le coût ; **la liste des catégories correspond aux catégories réelles utilisées ailleurs dans l'application** (Café, Lait & Laitier, Sirops & Arômes, Boulangerie / Pâtisserie, Frais, Emballages & Consommables, Boissons). |
| 4.7 | Créer l'ingrédient. | Il est immédiatement rattaché à la ligne d'origine, badge "Choix manuel", case "Mémoriser" cochée par défaut. |
| 4.8 | Ouvrir ensuite ce même ingrédient dans **Stock → État des Stocks** et vérifier sa catégorie. | La catégorie enregistrée correspond bien à celle choisie dans le formulaire (plus de valeur invalide silencieusement envoyée). |

---

## 5. Correspondance réutilisable (mapping produit)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 5.1 | Sur la ligne rattachée manuellement en section 4, laisser la case "Mémoriser pour [Fournisseur]" cochée. Terminer le parcours (étape 3) et cliquer "Valider & Enregistrer Définitivement". | À l'étape 3, un message vert indique le nombre de nouvelles correspondances qui seront mémorisées avant l'enregistrement. |
| 5.2 | Aller dans l'onglet **Correspondances** du module Fournisseurs. | La nouvelle correspondance apparaît, groupée sous le nom du fournisseur, avec le libellé exact de la facture, l'ingrédient cible, "Utilisée 0 fois" et la date de création. |
| 5.3 | Importer une **nouvelle** facture du même fournisseur contenant exactement le même libellé d'article (même texte, éventuellement une casse ou des espaces différents). | Dès l'étape 2, la ligne est **automatiquement rattachée** au même ingrédient, avec un badge bleu distinct **"Correspondance mémorisée"** (différent du badge gris "Suggestion automatique") — et **aucune case "Mémoriser" n'est proposée** puisque la correspondance existe déjà. |
| 5.4 | Valider cette seconde facture. | Retourner dans l'onglet Correspondances : le compteur d'usage de la correspondance est passé à 1. |
| 5.5 | Sur une facture en cours de vérification, changer le Fournisseur détecté dans l'en-tête vers un autre fournisseur qui n'a pas cette correspondance. | Les lignes déjà rattachées ne changent pas ; seules les lignes encore "Non rattaché" sont réévaluées avec les correspondances du nouveau fournisseur si applicable. |
| 5.6 | Dans l'onglet **Correspondances**, utiliser la recherche (par libellé, ingrédient ou fournisseur) et le filtre par fournisseur. | La liste se filtre correctement. |
| 5.7 | Sur une correspondance existante, utiliser le sélecteur d'ingrédient pour la réassigner à un autre ingrédient. | Un message de succès confirme la réassignation ; la ligne se met à jour immédiatement. |
| 5.8 | Réimporter (ou revalider mentalement) une facture avec ce libellé : la nouvelle association devrait s'appliquer désormais. | Confirme que la correction dans le panneau de gestion est bien prise en compte pour les futures factures. |
| 5.9 | Supprimer une correspondance (icône corbeille, confirmation demandée). | Elle disparaît de la liste. Une facture future avec ce libellé ne sera plus rattachée automatiquement — retour à la suggestion par ressemblance ou au rattachement manuel. |
| 5.10 | Avec la liste des correspondances vide (ou filtrée à vide), observer le message. | Un message d'aide explique clairement d'où proviennent les correspondances (elles se créent pendant la vérification d'une facture scannée) plutôt que d'afficher un tableau vide sans explication. |

---

## 6. Validation humaine obligatoire

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 6.1 | Vérifier qu'aucune facture n'apparaît dans **Fournisseurs → Factures** tant que l'étape 3 n'a pas été validée par un clic explicite sur "Valider & Enregistrer Définitivement". | Confirmé (aucune écriture automatique après l'étape 1 ou 2 seules). |
| 6.2 | Après validation, ouvrir la facture créée dans l'onglet Factures. | Toutes les valeurs enregistrées correspondent exactement à ce qui a été vérifié/corrigé à l'étape 2 (pas aux valeurs brutes détectées si elles ont été modifiées). |
| 6.3 | Si "Mettre à jour le stock automatiquement" était coché avec une zone choisie, vérifier le stock des ingrédients concernés. | Le stock a augmenté exactement des quantités et dans la zone affichées dans le récapitulatif de l'étape 3. |
| 6.4 | Décocher "Mettre à jour le stock automatiquement" avant de valider une facture avec des lignes rattachées. | La facture est enregistrée mais aucun mouvement de stock n'est créé — vérifiable dans Stock → Historique Mouvements. |

---

## 7. Nettoyage

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 7.1 | Supprimer les factures de test créées (onglet Factures). | Le stock qu'elles avaient éventuellement ajouté est automatiquement retiré (comportement du module Fournisseurs). |
| 7.2 | Supprimer les correspondances de test créées (onglet Correspondances). | Aucune erreur ; les prochaines factures avec ces libellés redeviendront non rattachées ou suggérées par ressemblance. |
| 7.3 | Supprimer les ingrédients de test créés spécifiquement pour ce test, si aucune fiche recette n'en dépend. | Suppression réussie. |

---

## Points de vigilance transverses

- **Rien n'est automatique sans preuve visible** : chaque champ affiche toujours un indicateur (confiance, ou provenance du rattachement — mémorisée / suggestion / manuel) ; il ne doit jamais y avoir d'ambiguïté sur ce qui a été détecté vs ce qui reste à vérifier.
- **100% local** : le traitement OCR (Tesseract, PDF, DOCX) s'exécute entièrement dans le navigateur ; aucune image ou texte de facture n'est envoyé à un service tiers. Seule l'écriture finale (après validation) part vers le serveur de l'application elle-même.
- **Les correspondances sont spécifiques à un fournisseur** : un même libellé provenant de deux fournisseurs différents peut être associé à deux ingrédients différents sans conflit.
- **Rien n'est irréversible sans confirmation** : suppression de facture, de correspondance, ou d'ingrédient passe toujours par une confirmation explicite.
