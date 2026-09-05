# Test manuel — Module Rapports, Alertes & Traçabilité

Ce document décrit les scénarios de test manuel à exécuter dans l'application (aucun test
automatisé n'a été lancé par l'assistant — c'est au développeur de dérouler ces étapes dans le
navigateur).

**Prérequis**
- Lancer l'application : `npm run dev`, puis se connecter avec un PIN administrateur.
- Ouvrir le module **Rapports, alertes & traçabilité** (icône tendance, dans la navigation
  rapide ou l'en-tête). Il comporte 4 onglets : **Rapports**, **Exports**, **Alertes**, **Journal
  d'activité**.
- Avoir des données existantes dans plusieurs modules (ventes, stock, fournisseurs, dépenses,
  personnel) pour que les rapports et exports ne soient pas vides — sinon, créer quelques
  enregistrements de test au préalable dans les modules concernés.

---

## 1. Onglet Rapports — compte de résultat

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 1.1 | Ouvrir l'onglet **Rapports**. Basculer entre "Aujourd'hui", "7 jours", "30 jours", "Trimestre". | Les montants (CA HT/TTC, marge brute, charges, résultat net) se recalculent à chaque changement de période, sans rester à zéro. |
| 1.2 | Comparer le total "Chiffre d'Affaires HT" affiché avec la somme réelle des ventes de la période (visible dans le module Ventes). | Les montants correspondent (TVA déduite correctement). |
| 1.3 | Vérifier la section "Répartition du CA par Catégorie" et "Top 5 Produits en Volume". | Les catégories et produits réellement vendus sur la période apparaissent, avec des montants cohérents (ni vide, ni figé à zéro). |
| 1.4 | Créer une vente historique via "Saisie Vente Hist.", avec un montant et une date passée. | Une nouvelle vente apparaît dans le module Ventes ; si sa date tombe dans la période affichée, les totaux du rapport se mettent à jour après rafraîchissement. |

---

## 2. Rapport mensuel PDF

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 2.1 | Dans l'onglet Rapports, section "Rapport mensuel PDF", choisir le mois en cours et cliquer "Télécharger le PDF". | Un fichier `rapport_mensuel_cafe_noir_AAAA-MM.pdf` est téléchargé, sans erreur affichée. |
| 2.2 | Ouvrir le PDF. Vérifier l'en-tête (nom du mois, date de génération). | L'en-tête est lisible, avec le bon mois. |
| 2.3 | Vérifier la présence de toutes les sections : CA & activité (avec évolution mensuelle en %), achats/charges/personnel, marge/stock/pertes, écarts d'inventaire, meilleures ventes, produits sous leur marge objectif, alertes principales. | Chaque section est présente ; les sections sans données affichent un message clair ("Aucune vente enregistrée ce mois-ci.", etc.) plutôt qu'un tableau vide ou une erreur. |
| 2.4 | Choisir un mois passé (sélecteur de mois) et régénérer le PDF. | Le contenu du PDF change et reflète les données de ce mois précis (comparaison avec le mois précédent celui-ci, pas avec le mois en cours). |
| 2.5 | Vérifier la pagination en bas de chaque page si le rapport dépasse une page. | "Café Noir · Rapport confidentiel · Page X / Y" apparaît sur chaque page. |

---

## 3. Exports Excel / CSV

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.1 | Ouvrir l'onglet **Exports**. Pour chaque jeu de données (Ventes, Achats fournisseurs, Dépenses, Stock, Personnel, Journal d'activité), cliquer "CSV". | Un fichier `.csv` est téléchargé pour chacun, sans erreur. |
| 3.2 | Ouvrir un des CSV dans Excel/LibreOffice. Vérifier les accents et le séparateur. | Les caractères accentués s'affichent correctement (pas de caractères corrompus), les colonnes sont bien séparées. |
| 3.3 | Répéter 3.1 en cliquant "Excel" pour chaque jeu de données. | Un fichier `.xlsx` est téléchargé pour chacun, s'ouvre sans erreur, avec un en-tête de colonnes en première ligne. |
| 3.4 | Comparer le contenu d'un export (ex. Dépenses) avec la liste affichée dans le module correspondant. | Les lignes et montants correspondent exactement aux données actuelles du module. |
| 3.5 | Sur un jeu de données sans aucune donnée (ex. juste après une réinitialisation), cliquer "Excel" ou "CSV". | Un message explicite "Aucune donnée à exporter..." apparaît, sans fichier vide téléchargé ni erreur bloquante. |

---

## 4. Alertes — chaque catégorie

Pour chaque scénario, provoquer la condition dans le module source puis vérifier que l'alerte
apparaît **automatiquement** dans l'onglet **Alertes** (aucune action manuelle de création
d'alerte n'existe : tout est calculé).

| # | Condition à provoquer | Résultat attendu dans l'onglet Alertes |
|---|------------------------|------------------------------------------|
| 4.1 | Stock — Ingrédients : baisser le stock d'un ingrédient sous son seuil minimal (mouvement manuel). | Une alerte "Seuil de stock bas" (sévérité Attention) apparaît, avec un lien "Ouvrir le module concerné" vers Stock. |
| 4.2 | Stock — faire passer le stock d'un ingrédient à 0 ou en négatif. | Une alerte "Rupture de stock" ou "Stock négatif" (sévérité Critique) apparaît. |
| 4.3 | Stock — créer un lot avec une date de péremption proche (dans le délai d'alerte configuré). | Une alerte "Péremption proche" (Attention) apparaît. |
| 4.4 | Stock — créer ou laisser un lot dont la date de péremption est dépassée. | Une alerte "Lot périmé" (Critique) apparaît. |
| 4.5 | Fournisseurs — enregistrer une facture via l'import OCR sans cocher la mise à jour du stock. | Une alerte "Facture OCR à vérifier" (Attention) apparaît, liée à cette facture. |
| 4.6 | Fournisseurs — créer une facture non payée avec une échéance dans moins de 5 jours. | Une alerte "Échéance proche" (Attention) apparaît. |
| 4.7 | Fournisseurs — créer une facture non payée avec une échéance déjà dépassée. | Une alerte "Facture en retard" (Critique) apparaît. |
| 4.8 | Stock — valider un inventaire avec un écart net (DT) supérieur au seuil configuré (par défaut 20 DT, réglable dans Alertes → Seuils). | Une alerte "Écart d'inventaire important" (Attention) apparaît, mentionnant le numéro d'inventaire et l'écart. |
| 4.9 | Produits — fixer, sur une fiche technique, une marge cible supérieure à la marge réelle calculée. | Une alerte "Marge sous l'objectif" (Attention) apparaît pour ce produit (uniquement s'il est disponible à la vente). |
| 4.10 | Résoudre une des conditions ci-dessus (ex. réapprovisionner l'ingrédient en 4.1). | L'alerte correspondante **disparaît automatiquement** de la liste au rechargement, sans action manuelle de suppression. |

---

## 5. Gestion manuelle des alertes

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 5.1 | Sur une alerte active, cliquer l'icône ✓ ("Marquer comme traitée"). | L'alerte disparaît de la vue par défaut ; le compteur d'alertes non traitées diminue (en-tête de l'onglet et badge de la cloche dans l'en-tête général). |
| 5.2 | Cocher "Afficher les alertes traitées". | L'alerte marquée traitée réapparaît, visuellement atténuée, avec un badge "Traitée". |
| 5.3 | Cliquer l'icône de restauration sur une alerte traitée. | Elle redevient active (badge "Traitée" disparaît, compteur remonte). |
| 5.4 | Avec plusieurs alertes actives, cliquer "Tout marquer traité". | Toutes les alertes passent à l'état traité en une seule action. |
| 5.5 | Ouvrir le panneau "Seuils", modifier le seuil d'écart d'inventaire significatif, enregistrer. | La valeur est conservée après rechargement de la page ; une alerte d'écart qui ne dépasse plus le nouveau seuil disparaît. |
| 5.6 | Ouvrir la cloche de notifications dans l'en-tête général de l'application. | Le nombre affiché correspond au nombre d'alertes **non traitées** ; cliquer une alerte y navigue vers le bon module ; un lien "Gérer toutes les alertes" ouvre l'onglet Alertes. |
| 5.7 | Vérifier qu'aucune alerte n'entraîne l'envoi d'un SMS, d'un e-mail ou d'un message WhatsApp. | Confirmé — les alertes ne sont visibles que dans l'application (aucune intégration de notification externe n'existe dans ce module). |

---

## 6. Journal d'activité — traçabilité

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 6.1 | Ouvrir l'onglet **Journal d'activité**. Effectuer une action dans un autre module (ex. modifier le prix d'un produit, corriger une dépense, changer le statut d'une facture fournisseur). | Une nouvelle entrée apparaît en tête de journal avec la date, l'heure, le module, l'action et l'utilisateur ayant effectué l'action. |
| 6.2 | Sélectionner cette entrée dans la liste. | Le panneau de détail affiche la description complète, l'utilisateur, la date/heure exacte et l'identifiant unique de l'entrée. |
| 6.3 | Effectuer une modification d'un champ suivi (ex. prix d'un produit, salaire de base d'un employé, statut de paiement d'une facture). | L'entrée de journal correspondante affiche une **valeur précédente** et une **nouvelle valeur** clairement distinguées (fond rouge/vert), en plus de la description. |
| 6.4 | Effectuer une action sans changement de valeur suivie (ex. simple création). | L'entrée n'affiche pas de section "valeur précédente / nouvelle valeur" (elles ne s'affichent que "si pertinent"). |
| 6.5 | Filtrer par module (Ventes, Stock & Pertes, Finances, RH & Présence, Administration). | Seules les entrées du module sélectionné restent visibles. |
| 6.6 | Utiliser la recherche texte (nom d'utilisateur, mot-clé de l'action ou des détails). | La liste se filtre en conséquence, combinée avec le filtre de module actif. |

---

## 7. Caractère immuable du journal (lecture seule)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 7.1 | Chercher, dans l'interface du Journal, un bouton ou une icône de modification ou de suppression sur une entrée. | Aucun bouton d'édition ou de suppression n'existe nulle part sur les entrées du journal. |
| 7.2 | Vérifier la mention affichée en haut de l'onglet Journal. | Le badge "Lecture seule — aucune modification possible" est visible. |
| 7.3 (technique) | Tenter d'appeler manuellement une requête `PATCH` ou `DELETE` sur `/api/journal/:id` (ex. via un outil HTTP). | La requête échoue (route inexistante — 404) : le serveur n'expose que la lecture (`GET /api/journal`). |
| 7.4 | Recharger complètement l'application (F5) après plusieurs actions. | Toutes les entrées de journal générées précédemment sont toujours présentes, dans le même ordre chronologique, avec les mêmes valeurs précédente/nouvelle. |

---

## Points de vigilance transverses

- **Alertes toujours à jour** : aucune alerte n'est stockée — elle reflète l'état actuel des
  données à chaque ouverture de l'onglet. Une alerte qui semble "bloquée" doit disparaître dès que
  la condition réelle (stock, échéance, marge...) est corrigée dans son module d'origine.
- **Aucune notification externe** : ni SMS, ni e-mail, ni WhatsApp ne doit jamais être déclenché
  par ce module — uniquement un affichage dans l'application (cloche, onglet Alertes, tableau de
  bord).
- **Journal immuable** : toute action importante (création, modification, désactivation,
  suppression) dans n'importe quel module doit produire une entrée de journal ; aucune de ces
  entrées ne doit pouvoir être modifiée ou supprimée depuis l'interface d'administration.
- **Devise** : tous les montants sont en Dinar Tunisien (DT), à 3 décimales, cohérents entre les
  rapports, les exports et le PDF mensuel.
