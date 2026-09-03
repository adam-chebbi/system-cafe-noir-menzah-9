# Test manuel — Module Fournisseurs, Achats & Factures

Ce document décrit les scénarios de test manuel à exécuter dans l'application (aucun test automatisé n'a été lancé par l'assistant — c'est au développeur de dérouler ces étapes dans le navigateur).

**Prérequis**
- Lancer l'application : `npm run dev`, puis se connecter avec un PIN administrateur.
- Naviguer vers le module **Fournisseurs & Factures OCR** (icône camion).
- Tester avec un fournisseur créé spécifiquement pour ce test (préfixer le nom par `TEST_`) pour le repérer facilement.
- Ce module s'appuie sur le module Stock (zones **Réserve principale** / **Dépôt**) déjà en place — toute réception y crée des mouvements de stock visibles dans **Stock → Historique Mouvements**.

---

## 1. Fournisseurs — fiche complète

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 1.1 | Onglet **Fournisseurs** → "Nouveau Fournisseur". Renseigner nom `TEST_Grossiste Café`, matricule fiscal, téléphone, WhatsApp, email, adresse, contact référent, notes. Enregistrer. | Le fournisseur est créé et visible dans la liste. |
| 1.2 | Sélectionner ce fournisseur, vérifier le panneau de détail. | Le WhatsApp et le Matricule Fiscal saisis sont affichés (et non "Non renseigné"). |
| 1.3 | Modifier le fournisseur (icône crayon), changer le téléphone, enregistrer. | La fiche est mise à jour immédiatement dans la liste et le détail. |
| 1.4 | Cliquer "Désactiver" sur ce fournisseur. | Le badge "Inactif" apparaît ; le fournisseur reste visible dans l'historique (aucune suppression définitive). |

---

## 2. Un produit, plusieurs fournisseurs & historique des prix

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 2.1 | Créer un deuxième fournisseur `TEST_Grossiste B`. | Créé. |
| 2.2 | Créer un bon de commande pour `TEST_Grossiste Café` avec une ligne sur un ingrédient existant (ex. Grains Éthiopie) à un prix X, puis le réceptionner (voir section 3). Répéter avec `TEST_Grossiste B` sur le **même ingrédient** à un prix Y différent. | Les deux réceptions réussissent sans blocage — rien n'empêche d'acheter le même produit à deux fournisseurs différents. |
| 2.3 | Créer un nouveau bon de commande, ajouter une ligne sur cet ingrédient, cliquer l'icône "i" (info) à côté de la ligne. | Un panneau "Historique d'achat (tous fournisseurs)" s'affiche avec les deux réceptions précédentes, chacune avec sa date, son fournisseur et son prix — permettant de comparer avant de choisir. |

---

## 3. Commandes fournisseurs — statuts & réceptions multiples

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.1 | Onglet **Commandes** → "Émettre Commande" (ou "Nouveau Bon de Commande" depuis le module). Choisir un fournisseur, ajouter 2 lignes d'articles avec quantités. Cliquer **"Enregistrer en Brouillon"**. | Le bon apparaît avec le badge **"Brouillon"**. Aucun mouvement de stock n'est créé. |
| 3.2 | Sélectionner ce brouillon, cliquer **"Envoyer au Fournisseur"**. | Le statut passe à **"Commandée"**. |
| 3.3 | Recréer un bon (ou réutiliser), cette fois cliquer directement **"Envoyer au Fournisseur"** à la création. | Le bon est créé directement au statut **"Commandée"** (pas besoin de repasser par brouillon). |
| 3.4 | Sur un bon "Commandée", cliquer **"Réceptionner (total ou partiel)"**. Dans la modale, réduire la quantité reçue de la première ligne à la moitié de la quantité commandée, choisir la zone **Dépôt**, valider. | Le statut du bon passe à **"Partiellement reçue"**. La ligne concernée affiche "Reçu : X / Y". Un mouvement d'entrée de stock apparaît dans **Stock → Historique Mouvements**, zone **Dépôt**, avec l'origine = nom du fournisseur. |
| 3.5 | Rouvrir la modale de réception sur ce même bon. | Les quantités pré-remplies correspondent au **reste à recevoir** (et non à la quantité totale d'origine). |
| 3.6 | Réceptionner le reste (toutes les lignes), zone **Réserve principale** cette fois. Valider. | Le statut passe à **"Reçue"**. Le panneau de détail affiche l'**historique des réceptions** avec 2 entrées distinctes (dates, zones, quantités différentes). |
| 3.7 | Vérifier le stock de l'ingrédient concerné dans **Stock → État des Stocks**. | Le stock est augmenté à la fois en Dépôt et en Réserve principale, dans les proportions des deux réceptions. |
| 3.8 | Créer un nouveau bon, l'envoyer, puis l'annuler ("Annuler ce bon de commande") avant toute réception. | Statut **"Annulée"**, motif affiché. |
| 3.9 | Tenter d'annuler un bon déjà au statut "Reçue". | L'annulation est refusée avec un message explicite (impossible d'annuler une commande déjà entièrement reçue). |

---

## 4. Factures fournisseurs — liaison, montants, statuts de paiement

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 4.1 | Onglet **Factures** → "Saisie Historique". Choisir un fournisseur, lier le bon de commande créé en section 3 (menu "Bon de commande lié"), saisir N° facture, montant HT (vérifier que la TVA se calcule automatiquement à 7%), échéance, laisser la case "déjà réglée" cochée. Enregistrer. | La facture est créée, liée au bon de commande (visible dans le détail : "Bon de commande lié : BC-..."), statut **"Payée"**. |
| 4.2 | Recommencer sans lier de bon de commande ("Aucun — facture indépendante") et en décochant "déjà réglée". | Facture créée sans lien, statut **"Non payée"**. |
| 4.3 | Sélectionner cette facture non payée, cliquer **"Enregistrer un Paiement"**, saisir un montant **inférieur** au total, valider. | Le statut passe à **"Partiellement payée"**. Le panneau affiche "Réglé : X DT" et "Reste à payer : Y DT" avec le paiement listé dans l'historique (date, montant, mode). |
| 4.4 | Enregistrer un second paiement couvrant le solde restant. | Le statut passe à **"Payée"**. L'historique affiche les 2 paiements. Le bouton "Enregistrer un Paiement" disparaît. |
| 4.5 | Créer une facture avec une échéance dans 2 jours (aujourd'hui + 2). | Un badge **"Échéance dans 2 j"** (ambre) apparaît dans la liste et le détail ; le compteur "échéance proche" en haut de page augmente. |
| 4.6 | Créer une facture avec une échéance dans le passé (hier). | Un badge **"En retard"** (rouge) apparaît ; le compteur "en retard" augmente ; une alerte est visible dans la cloche de notifications. |
| 4.7 | Vérifier le montant "Restant à régler" dans la barre du haut. | Il correspond à la somme des soldes impayés (total − montant déjà réglé) de toutes les factures non annulées, pas aux montants totaux bruts. |

---

## 5. Factures — mise à jour du stock, annulation, suppression

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 5.1 | Utiliser **"Scanner Facture (OCR)"**, importer un document de test, faire correspondre au moins une ligne à un ingrédient existant, choisir la zone de réception (Réserve principale ou Dépôt) dans l'étape de confirmation, cocher "Mettre à jour le stock automatiquement", enregistrer. | La facture est créée, le stock de l'ingrédient augmente dans la zone choisie, un mouvement d'entrée apparaît avec le nom du fournisseur en origine. |
| 5.2 | Noter le stock de l'ingrédient concerné, puis **annuler** cette facture (bouton "Annuler"). | La facture passe en statut "Annulé". Le stock de l'ingrédient **redescend** exactement de la quantité qui avait été ajoutée (vérifiable dans Stock → Historique Mouvements : une écriture de retrait apparaît, référencée à la facture). |
| 5.3 | Créer une autre facture avec mise à jour de stock, puis la **supprimer** définitivement (icône corbeille). | Même comportement que l'annulation : le stock est réajusté avant la suppression, pas de désynchronisation. |
| 5.4 | Créer une facture **sans** cocher la mise à jour du stock, puis l'annuler. | Aucun mouvement de stock n'est généré (rien à réajuster) — pas d'erreur. |

---

## 6. Nettoyage

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 6.1 | Supprimer/annuler les factures et bons de commande `TEST_*` créés. | Les factures non annulées peuvent être supprimées ; les bons de commande "Reçue" ne peuvent pas être annulés mais restent visibles pour archivage. |
| 6.2 | Désactiver les fournisseurs `TEST_*`. | Ils disparaissent des listes de sélection actives mais restent consultables dans l'historique des bons/factures déjà créés. |

---

## Points de vigilance transverses

- **Devise** : tous les montants sont en Dinar Tunisien (DT), à 3 décimales.
- **Zones de stock** : toute réception (commande ou facture) doit préciser une zone (Réserve principale / Dépôt) — vérifier que le mouvement de stock généré porte bien la zone choisie, pas systématiquement la Réserve principale par défaut.
- **Historique jamais perdu** : corriger un statut, annuler une facture ou une commande ne doit jamais effacer l'historique des réceptions/paiements déjà enregistrés — seules des écritures correctrices sont ajoutées.
- **Échéances** : le statut "en retard"/"échéance proche" d'une facture est recalculé à chaque affichage de la liste (basé sur la date du jour), pas figé au moment de la création — revenir sur la liste un autre jour pour vérifier que le badge évolue en conséquence.
