# Test manuel — Module Dépenses

Ce document décrit les scénarios de test manuel à exécuter dans l'application (aucun test automatisé n'a été lancé par l'assistant — c'est au développeur de dérouler ces étapes dans le navigateur).

**Prérequis**
- Lancer l'application : `npm run dev`, puis se connecter avec un PIN administrateur.
- Naviguer vers le module **Dépenses** (icône reçu, anciennement "Charges & Dépenses").
- Tester avec des dépenses préfixées `TEST_` pour les repérer facilement et les supprimer ensuite.

---

## 1. Catégories — adaptables par l'administrateur

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 1.1 | Ouvrir le module Dépenses. Vérifier les catégories disponibles (bouton "Catégories" ou filtre en haut de liste). | Les 12 catégories initiales sont présentes : Loyer, STEG, SONEDE, Téléphone / Internet, Personnel, Entretien, Réparation, Marketing, Fournitures, Transport, Taxes et frais, Divers. |
| 1.2 | Cliquer "Catégories". Ajouter une nouvelle catégorie `TEST_Assurance`. | Elle apparaît immédiatement dans la liste et devient disponible dans le formulaire de nouvelle dépense. |
| 1.3 | Tenter de créer une catégorie avec un nom déjà existant (ex. "Loyer"). | Message d'erreur explicite — pas de doublon créé. |
| 1.4 | Renommer `TEST_Assurance` en `TEST_Assurance Locaux` (icône crayon, valider avec Entrée ou le bouton coché). | Le nom est mis à jour partout où la catégorie est utilisée. |
| 1.5 | Créer une dépense utilisant `TEST_Assurance Locaux`, puis tenter de supprimer cette catégorie. | Suppression refusée avec un message expliquant combien de dépenses l'utilisent encore et suggérant de la désactiver. |
| 1.6 | Désactiver la catégorie (icône œil barré) au lieu de la supprimer. | Elle disparaît des choix proposés pour une **nouvelle** dépense, mais la dépense déjà créée avec cette catégorie continue de l'afficher normalement. |
| 1.7 | Réactiver la catégorie. | Elle redevient disponible dans le formulaire. |
| 1.8 | Supprimer la dépense de test, puis supprimer la catégorie `TEST_Assurance Locaux` (usage désormais à 0). | Suppression définitive réussie. |

---

## 2. Création d'une dépense — champs complets

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 2.1 | Cliquer "Nouvelle Dépense". Remplir : intitulé `TEST_Réparation Machine`, catégorie "Réparation", montant TTC `150.000`, date du jour, mode de paiement "Carte Bancaire Pro", commentaire "Test complet". | Le champ TVA se calcule automatiquement (taux 7%, cohérent avec le reste de l'application). |
| 2.2 | Choisir Type = "Variable". Ne pas cocher "Dépense récurrente". Joindre une photo en justificatif. Enregistrer. | La dépense apparaît dans la liste avec les badges "Variable", la catégorie, et une icône de justificatif cliquable. |
| 2.3 | Ouvrir la fiche de cette dépense (clic sur la ligne). | Le panneau de détail affiche tous les champs : catégorie, type, date, mode de paiement, commentaire, montant HT/TVA/TTC, justificatif. |
| 2.4 | Modifier cette dépense (bouton "Modifier") : changer le montant. | Le montant HT et la TVA affichés en détail se recalculent avec le nouveau montant. |

---

## 3. Dépenses récurrentes — configuration et identification claire

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 3.1 | Créer `TEST_Abonnement Internet`, catégorie "Téléphone / Internet", type "Fixe", cocher "Dépense récurrente", fréquence "Mensuelle", date d'aujourd'hui. Enregistrer. | La dépense apparaît avec un badge distinct "Mensuelle" (icône répétition), en plus des badges Fixe/catégorie. |
| 3.2 | Ouvrir sa fiche. | Un panneau "Récurrence — Mensuelle" affiche la prochaine échéance calculée (date du jour + 1 mois), avec les boutons "Renouveler" et "Arrêter". |
| 3.3 | Modifier manuellement la **date** de cette dépense pour la mettre à plus d'un mois dans le passé (simuler une échéance dépassée), sans changer autre chose. | Un badge ambre "À renouveler" apparaît sur la ligne dans la liste, et le compteur "X à renouveler" apparaît dans la barre d'en-tête. |
| 3.4 | Cliquer le bouton "Renouveler" (icône ↺) directement depuis la liste, ou depuis la fiche détaillée. | La modale "Nouvelle Dépense" s'ouvre **pré-remplie** (même intitulé, catégorie, montant, type, récurrence) avec la date de prochaine échéance déjà calculée — **rien n'est enregistré tant que vous n'avez pas cliqué sur "Enregistrer"**. |
| 3.5 | Ajuster si besoin (ex. montant légèrement différent) puis valider. | Une nouvelle dépense est créée, liée à la même récurrence. La dépense d'origine n'est plus signalée "à renouveler" (c'est désormais la nouvelle occurrence qui porte l'échéance suivante). |
| 3.6 | Ouvrir la fiche de la dépense la plus récente de cette récurrence, cliquer "Arrêter". | Une confirmation est demandée. Une fois confirmée, le panneau de récurrence indique que la récurrence est arrêtée ; elle ne génère plus d'alerte "à renouveler", mais l'historique des occurrences passées reste intact et consultable. |
| 3.7 | Utiliser le filtre "À renouveler" (badge ambre cliquable dans l'en-tête) quand il est visible. | La liste se filtre pour n'afficher que les dépenses récurrentes dont l'échéance est due. |

---

## 4. Fixe vs Variable

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 4.1 | Créer deux dépenses de test, l'une en "Fixe", l'autre en "Variable". | Les cartes "Fixes" et "Variables" en haut de l'écran affichent des totaux distincts qui incluent bien chaque dépense dans la bonne colonne. |
| 4.2 | Utiliser les filtres "Tous types / Fixes / Variables" dans la barre de filtre. | La liste se filtre correctement selon le type choisi. |

---

## 5. Justificatifs (photo / PDF)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 5.1 | Créer une dépense avec un justificatif image (JPG/PNG). | Une icône de justificatif apparaît sur la ligne de liste ; cliquer dessus ouvre un aperçu avec zoom et option de téléchargement. |
| 5.2 | Créer une dépense avec un justificatif PDF. | Le fichier est accepté et reste consultable/téléchargeable de la même manière. |
| 5.3 | Modifier une dépense pour retirer son justificatif (bouton X sur l'aperçu dans le formulaire), puis enregistrer. | Le justificatif disparaît de la fiche et de la liste. |

---

## 6. Saisie historique (rétroactive)

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 6.1 | Cliquer "Saisie Historique". Remplir une dépense papier ancienne avec sa date réelle, un justificatif scanné, et des notes. | Le formulaire bascule en mode historique (dates/mode de paiement standards masqués au profit du panneau document historique). |
| 6.2 | Enregistrer. | La dépense apparaît avec le badge "Historique" dans la liste et le détail. |
| 6.3 | Vérifier qu'aucune case inutile ("Inclure dans les totaux comptables...") n'apparaît dans ce panneau. | Confirmé — seules les informations pertinentes pour une dépense (date document, justificatif, notes) sont demandées. |

---

## 7. Recherche et filtres combinés

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 7.1 | Combiner une recherche texte + un filtre de catégorie + un filtre de type simultanément. | La liste applique les trois filtres ensemble (ET logique), pas seulement le dernier appliqué. |
| 7.2 | Réinitialiser tous les filtres ("Toutes" + "Tous types" + recherche vide). | La liste complète réapparaît. |

---

## 8. Suppression

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 8.1 | Supprimer une dépense de test (bouton corbeille, liste ou fiche). | Une confirmation est demandée avant suppression définitive. |
| 8.2 | Confirmer. | La dépense disparaît de la liste et du détail. |

---

## 9. Nettoyage

| # | Étape | Résultat attendu |
|---|-------|-------------------|
| 9.1 | Supprimer toutes les dépenses `TEST_*` créées. | Suppression réussie pour chacune. |
| 9.2 | Supprimer les catégories `TEST_*` créées (une fois leur usage à 0). | Suppression réussie. |

---

## Points de vigilance transverses

- **Devise** : tous les montants sont en Dinar Tunisien (DT), à 3 décimales, cohérents dans toute l'interface (liste, détail, formulaire).
- **Aucune génération automatique** : une dépense récurrente n'écrit jamais d'occurrence future toute seule — elle se contente de signaler clairement qu'une échéance est due et propose un renouvellement en un clic, toujours revu avant enregistrement.
- **Historique jamais perdu** : renommer une catégorie, arrêter une récurrence, ou désactiver une catégorie ne doit jamais faire disparaître les dépenses déjà enregistrées ni fausser leur affichage.
- **Numérotation des dépenses** : après plusieurs créations/suppressions, vérifier qu'aucun numéro de dépense (`DEP-AAAA-NNN`) n'est dupliqué.
