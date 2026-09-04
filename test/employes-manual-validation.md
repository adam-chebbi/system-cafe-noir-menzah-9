# Validation manuelle — Module Employés

Ce document décrit les scénarios de test manuel du module **Employés** (Ressources
humaines). Aucun test automatisé n'est fourni : chaque scénario doit être rejoué à la
main dans l'application, sur tablette ou navigateur desktop.

## Préparation

1. Lancer l'application et ouvrir le module **Équipe & présence** (menu de navigation
   rapide, ou tuiles "Employés" / "Planning & présence" / "Suivi financier").
2. Vérifier la présence des trois onglets en haut de page : **Employés**,
   **Planning & présence**, **Suivi financier**.
3. Vérifier qu'il n'existe **aucun** bouton de pointage (arrivée/départ), badgeuse,
   lecteur biométrique, génération automatique de bulletin de paie ou de déclaration
   sociale nulle part dans le module. Toute donnée de présence ou financière doit être
   saisie manuellement par l'administrateur.
4. Vérifier que l'encart "Coût personnel enregistré" en haut de page affiche un montant
   en DT cohérent avec les données existantes.

## 1. CRUD Employés

### 1.1 Création

1. Cliquer sur **Nouvel employé**.
2. Renseigner : nom complet, poste, téléphone, date d'entrée, salaire de base, numéro
   CIN, date d'émission CIN.
3. Cliquer sur la pastille photo (icône appareil photo) et importer une image depuis le
   disque : vérifier que l'aperçu circulaire se met à jour immédiatement.
4. Utiliser **Joindre la copie de la CIN** pour importer une image ou un PDF : vérifier
   qu'un badge de pièce jointe apparaît et qu'il est possible de la consulter en cliquant
   dessus.
5. Laisser la case **Employé actif** cochée et enregistrer.
6. **Résultat attendu** : une nouvelle carte apparaît dans la grille, avec la bonne
   photo (ou les initiales à défaut), le badge **Actif**, le poste, le téléphone, le
   numéro CIN et le salaire de base.

### 1.2 Modification

1. Cliquer sur l'icône crayon d'une carte employé.
2. Modifier le poste, le téléphone et le salaire de base ; enregistrer.
3. **Résultat attendu** : la carte reflète immédiatement les nouvelles valeurs.

### 1.3 Recherche et filtrage

1. Saisir un nom partiel puis un intitulé de poste partiel dans la barre de recherche.
2. **Résultat attendu** : seules les cartes correspondantes restent visibles.
3. Cocher **Inclure les inactifs** : les employés désactivés (voir 1.4) réapparaissent
   avec le badge **Inactif** et une opacité réduite.

### 1.4 Désactivation / réactivation (suppression)

1. Sur un employé actif, cliquer sur l'icône utilisateur barré ("Désactiver").
2. Confirmer dans la boîte de dialogue.
3. **Résultat attendu** : sans "Inclure les inactifs" coché, l'employé disparaît de la
   liste par défaut et n'apparaît plus dans la grille de planning (onglet Planning &
   présence) ni dans la liste déroulante du formulaire Suivi financier. L'historique de
   présence et de suivi financier déjà saisi pour cet employé reste intact.
4. Cocher **Inclure les inactifs**, retrouver l'employé, cliquer sur l'icône utilisateur
   coché ("Réactiver") puis confirmer.
5. **Résultat attendu** : l'employé redevient **Actif** et réapparaît dans le planning.

### 1.5 Validation des champs obligatoires

1. Tenter d'enregistrer un nouvel employé sans nom ou sans poste.
2. **Résultat attendu** : le formulaire refuse l'envoi (champs requis du navigateur) ou
   affiche une notification d'erreur explicite si la validation serveur est atteinte.

## 2. Planning & Présence (100 % manuel)

### 2.1 Navigation

1. Ouvrir **Planning & présence** : une grille hebdomadaire s'affiche avec une ligne par
   employé actif et une colonne par jour (Lun → Dim).
2. Utiliser les flèches précédente/suivante pour changer de semaine, puis
   **Aujourd'hui** pour revenir à la semaine courante.
3. **Résultat attendu** : la colonne correspondant à la date du jour est mise en
   évidence visuellement.

### 2.2 Saisie d'une présence

1. Cliquer sur une case vide ("+ Ajouter") pour un employé et un jour donnés.
2. Choisir un statut parmi **Présent, Absent, Congé, Repos, Retard**.
3. Renseigner une heure prévue de début et de fin, puis une note optionnelle (ex. motif
   de retard).
4. Enregistrer.
5. **Résultat attendu** : la case affiche désormais un badge coloré avec le libellé du
   statut et la plage horaire prévue. La légende de couleurs en haut de la grille permet
   d'identifier chaque statut sans ouvrir la case.

### 2.3 Correction d'une présence existante

1. Cliquer sur une case déjà renseignée.
2. Changer le statut (ex. Présent → Retard) et/ou les horaires, puis enregistrer.
3. **Résultat attendu** : la case se met à jour ; **aucune ligne en double** n'est créée
   pour ce même employé et cette même date (une seule entrée par employé et par jour).

### 2.4 Suppression d'une présence

1. Rouvrir une case déjà renseignée et cliquer sur **Supprimer**.
2. Confirmer dans la boîte de dialogue.
3. **Résultat attendu** : la case redevient vide ("+ Ajouter").

### 2.5 Filtrage par employé

1. Désactiver temporairement un employé (voir 1.4).
2. **Résultat attendu** : sa ligne disparaît de la grille de planning tant qu'il est
   inactif, sans perdre les présences déjà enregistrées (elles réapparaissent si on le
   réactive).

## 3. Suivi financier

### 3.1 Création d'une saisie

1. Ouvrir **Suivi financier** et cliquer sur **Nouvelle saisie**.
2. Choisir un employé : vérifier que le salaire de base se pré-remplit automatiquement
   à partir de son dossier.
3. Saisir avances, primes, retenues, montant payé, date de paiement et une note
   optionnelle ; enregistrer.
4. **Résultat attendu** : une nouvelle ligne apparaît dans le tableau avec toutes les
   valeurs saisies.

### 3.2 Modification et suppression

1. Cliquer sur l'icône crayon d'une ligne, modifier un montant, enregistrer.
2. Cliquer sur l'icône de suppression d'une autre ligne et confirmer.
3. **Résultat attendu** : les deux actions se reflètent immédiatement dans le tableau.

### 3.3 Filtres et totaux

1. Filtrer par employé via le menu déroulant, puis par mois via le sélecteur de mois.
2. **Résultat attendu** : le tableau et les cartes de synthèse (Coût total personnel,
   Salaires de base, Avances, Primes, Montant payé) se recalculent uniquement sur les
   lignes filtrées.
3. Vérifier l'égalité : **Coût total personnel = Σ(Salaires de base) + Σ(Avances) +
   Σ(Primes) − Σ(Retenues)**.
4. Retirer le filtre de mois ("Tous les mois") : les totaux reprennent l'ensemble des
   saisies.

### 3.4 Portée V1

1. Confirmer qu'aucun bulletin de paie, net-à-payer calculé, cotisation sociale ou
   déclaration fiscale n'est généré ou affiché nulle part : le module se limite au suivi
   manuel des montants saisis par l'administrateur.

## 4. Persistance et traçabilité

1. Recharger complètement l'application (F5).
2. **Résultat attendu** : tous les employés, présences et saisies financières créés
   pendant les tests précédents sont toujours présents, avec les mêmes valeurs.
3. Ouvrir le **Journal d'activité** et vérifier qu'une entrée apparaît pour chaque
   création, modification, désactivation/réactivation d'employé, saisie/correction de
   présence, et création/modification/suppression de suivi financier réalisée pendant
   les tests.

## 5. Tablette / usage non technique

1. Reproduire les scénarios 1.1, 2.2 et 3.1 sur un écran tactile (ou fenêtre réduite à
   une largeur de tablette, ex. 820 px).
2. **Résultat attendu** : tous les boutons et champs restent facilement identifiables et
   actionnables au doigt, les tableaux (grille de planning, registre financier)
   défilent horizontalement sans faire déborder la page, et aucun texte n'est tronqué de
   façon illisible.
