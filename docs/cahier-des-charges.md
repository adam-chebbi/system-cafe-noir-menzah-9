# CAFÉ NOIR — CAHIER DES CHARGES
## Solution de gestion — Version V1

**Client:** Café Noir — Menzah 9
**Prestataire:** Ste Creative Comet SARL
**Version:** V1
**Date:** 17/08/2026

> Ce fichier est une copie fidèle du cahier des charges signé. Ne pas modifier son
> contenu ici — toute évolution de périmètre doit faire l'objet d'un avenant, pas
> d'une édition de ce fichier. C'est la référence contractuelle utilisée par
> `CLAUDE.md` / `AGENT.md` pour délimiter le développement.

---

# 1. OBJET ET PÉRIMÈTRE

Le présent cahier des charges définit les fonctionnalités comprises dans la V1 de la solution de gestion développée pour Café Noir — Menzah 9.

Toute fonctionnalité non mentionnée dans ce document est considérée comme hors périmètre et pourra faire l'objet d'un devis complémentaire.

## Configuration générale

| Élément | V1 |
|---|---|
| Établissement | Café Noir — Menzah 9 |
| Type de solution | Application web responsive |
| Supports | Ordinateur, tablette, smartphone |
| Langue | Français |
| Utilisateur | 1 Administrateur |
| Droits administrateur | Accès complet |
| Création d'autres utilisateurs | Non |
| Multi-établissements | Non |

---

# 2. MODULE — TABLEAU DE BORD & VENTES

## 2.1 Tableau de bord

Le tableau de bord doit afficher notamment :

- Chiffre d'affaires du jour
- Chiffre d'affaires du mois
- Achats
- Dépenses
- Valeur du stock
- Coût du personnel
- Nombre de tickets
- Panier moyen
- Marge estimée
- Produits les plus vendus
- Produits les moins vendus
- Produits générant le plus de chiffre d'affaires
- Produits générant le plus de marge
- Principales alertes

## Filtres d'analyse

Les données doivent pouvoir être filtrées par :

- Aujourd'hui
- Hier
- Semaine
- Mois
- Période personnalisée

## Comparaison et graphiques

Les principaux indicateurs peuvent :

- Être comparés à la période précédente
- Être affichés sous forme de graphiques

---

## 2.2 Module — Ventes

Les ventes doivent pouvoir être enregistrées de manière détaillée par :

- Saisie manuelle
- Import Excel
- Import CSV

## Données d'une vente

Une vente comprend notamment :

- Produit
- Variante
- Quantité
- Prix
- Date
- Nombre de tickets
- Mode de paiement
- Type de consommation

## Modes de paiement

Les modes disponibles sont :

- Espèces
- TPE
- Ticket restaurant

## Types de consommation

Les types disponibles sont :

- Sur place
- À emporter

## Correction des ventes

L'administrateur peut :

- Corriger une vente déjà enregistrée
- Annuler une opération

Toute modification doit rester tracée.

Les données ne doivent pas être supprimées définitivement.

Une opération doit être :

- Corrigée
- Ou annulée

avec conservation de son historique.

---

# 3. MODULE — PRODUITS, RECETTES & MARGES

## 3.1 Catalogue

### Organisation

Le catalogue doit suivre la structure :

Catégorie → Sous-catégorie → Produit

## Fiche produit

Une fiche produit peut comprendre :

- Nom
- Description
- Photo
- Prix
- Catégorie
- Disponibilité
- Variantes
- Suppléments
- Fiche technique
- Coût matière
- Marge

---

## 3.2 Module — Fiches techniques / Recettes

Une recette peut contenir :

- Ingrédients
- Quantités
- Unités
- Sous-recettes

## Unités principales

Les unités principales sont :

- kg
- g
- litre
- ml
- unité

## Conversions

Les conversions entre unités compatibles doivent être gérées automatiquement.

## Recalcul du coût matière

Le coût matière doit être recalculé lorsque le coût d'un ingrédient évolue.

## Indicateurs affichés

La plateforme doit afficher :

- Prix de vente
- Coût matière
- Marge brute estimée
- Taux de marge
- Comparaison avec une marge cible

---

## 3.3 Module — Consommation théorique

Les ventes et les fiches techniques permettent de calculer automatiquement :

- La consommation théorique des ingrédients

Cette consommation est utilisée pour :

- Déterminer le stock théorique
- Comparer le stock théorique au stock réellement constaté lors des inventaires

---

# 4. MODULE — GESTION DES STOCKS

## 4.1 Zones de stockage

Deux zones sont prévues :

1. Réserve principale
2. Dépôt

### Restrictions V1

- L'ajout de nouvelles zones n'est pas disponible dans la V1.
- Un même article peut être présent dans les deux zones.

---

## 4.2 Module — Mouvements de stock

Chaque mouvement peut enregistrer :

- Date et heure
- Produit
- Quantité
- Zone concernée
- Origine
- Destination
- Motif
- Commentaire

## Transferts

Les transferts entre :

- Réserve principale
- Dépôt

sont liés automatiquement.

## Historique

Les :

- Modifications
- Annulations

doivent rester enregistrées dans l'historique.

## Stock négatif

Le stock négatif est autorisé.

Lorsqu'un stock devient négatif :

- Une alerte doit être générée.

---

## 4.3 Module — Inventaires

La plateforme permet :

- Inventaire complet
- Inventaire par catégorie
- Inventaire par zone

## Données par article

Pour chaque article, afficher :

- Stock théorique
- Stock réel
- Écart
- Valeur estimée de l'écart

## Validation d'un inventaire

À la validation, l'administrateur doit pouvoir choisir :

### Option 1
Ajuster le stock au stock réel.

### Option 2
Conserver le stock théorique.

Dans les deux cas :

- L'écart reste enregistré.

---

## 4.4 Module — Pertes & ajustements

Les motifs disponibles comprennent notamment :

- Perte
- Casse
- Péremption
- Consommation interne
- Produit offert
- Erreur de préparation
- Ajustement d'inventaire
- Autre

## Rapport des pertes

Un rapport doit permettre de suivre les pertes :

- En quantité
- En valeur

---

## 4.5 Module — Lots, péremptions & seuils

La gestion des lots est :

- Facultative selon les produits

## Réception

Une réception peut comporter :

- Numéro de lot
- Date de péremption

## Alertes de péremption

Le délai d'alerte avant péremption doit être :

- Paramétrable

## Seuils de stock

Chaque produit peut avoir :

- Un seuil minimum
- Un stock cible

## Alertes

Les produits suivants doivent être signalés :

- Produits expirés
- Produits sous leur seuil

---

## 4.6 Module — Valorisation du stock

La valorisation du stock doit être effectuée selon :

- Le coût moyen pondéré

Le coût moyen sert notamment au calcul de :

- Valeur du stock
- Coût des ingrédients
- Coût matière
- Marges estimées

---

# 5. MODULE — FOURNISSEURS, ACHATS & FACTURES

## 5.1 Module — Fournisseurs

Une fiche fournisseur peut contenir :

- Nom / raison sociale
- Matricule fiscal
- Téléphone
- WhatsApp
- Email
- Adresse
- Contact principal
- Notes

## Relations fournisseurs / produits

Un produit peut avoir :

- Plusieurs fournisseurs

## Historique des prix

L'historique des prix d'achat doit être conservé.

---

## 5.2 Module — Commandes fournisseurs

La plateforme permet de :

- Créer des bons de commande

## Statuts

Une commande peut avoir les statuts :

- Brouillon
- Commandée
- Partiellement reçue
- Reçue
- Annulée

## Réceptions multiples

Une commande peut faire l'objet :

- De plusieurs réceptions

## Impact sur le stock

La validation d'une réception doit :

- Augmenter automatiquement le stock correspondant.

---

## 5.3 Module — Factures fournisseurs

Une facture peut être :

- Liée à une commande
- Non liée à une commande

## Informations principales

Une facture comprend :

- Fournisseur
- Numéro
- Date
- Échéance
- Montant HT
- TVA
- Montant TTC
- Montant payé
- Mode de paiement

## Statuts

Les statuts disponibles sont :

- Non payée
- Partiellement payée
- Payée

## Échéances

Les prochaines échéances doivent être :

- Signalées dans la plateforme

---

# 6. MODULE — OCR DES FACTURES

## Import

L'administrateur peut importer une facture au format :

- Photo
- JPG
- PNG
- PDF

## Informations à extraire

Le système tente d'extraire notamment :

- Fournisseur
- Numéro
- Date
- Produits
- Quantités
- Prix unitaires
- Montant HT
- TVA
- Montant TTC

## Vérification humaine

Avant intégration, l'administrateur doit disposer d'un écran permettant de :

- Vérifier les informations détectées
- Modifier les informations détectées
- Valider les informations détectées

## Correspondance des produits

Lorsqu'un libellé fournisseur ne correspond pas exactement à un produit existant :

- L'administrateur peut créer une correspondance.
- Cette correspondance doit être réutilisable pour les prochaines factures.

## Validation obligatoire

La validation humaine reste obligatoire avant :

- L'intégration définitive.

---

# 7. MODULE — DÉPENSES

La plateforme permet d'enregistrer :

- Dépenses fixes
- Dépenses variables

## Catégories initiales

Les catégories initiales sont :

- Loyer
- STEG
- SONEDE
- Téléphone / internet
- Personnel
- Entretien
- Réparation
- Marketing
- Fournitures
- Transport
- Taxes et frais
- Divers

## Personnalisation

Les catégories peuvent être adaptées par :

- L'administrateur

## Informations d'une dépense

Une dépense peut comprendre :

- Montant
- Date
- Catégorie
- Caractère fixe ou variable
- Récurrence
- Mode de paiement
- Commentaire
- Justificatif photo ou PDF

---

# 8. MODULE — EMPLOYÉS

## Fiche employé

Une fiche employé peut comprendre :

- Nom et prénom
- Téléphone
- Poste
- Date d'entrée
- Statut actif / inactif
- Photo
- Salaire
- Numéro CIN
- Date de délivrance
- Copie/photo de la CIN

---

## 8.1 Module — Planning & présence

La plateforme permet d'enregistrer :

- Horaires prévus
- Présent
- Absent
- Congé
- Repos
- Retard

## Saisie

La présence est :

- Saisie manuellement

## Exclusions

Aucun :

- Dispositif biométrique
- Matériel de pointage

n'est inclus.

---

## 8.2 Module — Suivi financier des employés

Pour chaque employé, suivre :

- Salaire de base
- Avances
- Primes
- Retenues
- Montant payé
- Date de paiement

## Coût du personnel

La plateforme permet de suivre :

- Le coût global du personnel

## Limitation V1

La V1 n'est pas :

- Un logiciel de paie
- Un logiciel de déclaration sociale

---

# 9. MODULE — RAPPORTS, ALERTES & TRAÇABILITÉ

## 9.1 Module — Exports

Les données des différents modules peuvent être exportées lorsque pertinent en :

- Excel
- CSV

---

## 9.2 Module — Rapport mensuel PDF

Un rapport mensuel peut être généré automatiquement avec notamment :

- Chiffre d'affaires
- Évolution mensuelle
- Tickets
- Panier moyen
- Achats
- Dépenses
- Coût du personnel
- Marge estimée
- Valeur du stock
- Pertes
- Écarts d'inventaire
- Produits les plus vendus
- Produits à faible marge
- Principales alertes

---

## 9.3 Module — Alertes

Les alertes sont :

- Affichées directement dans la plateforme

Elles concernent notamment :

- Stock faible
- Rupture
- Stock négatif
- Péremption proche
- Produit périmé
- Facture OCR à vérifier
- Facture fournisseur à échéance
- Écart de stock important
- Marge sous l'objectif

## Restrictions V1

Aucune alerte :

- SMS
- WhatsApp
- Email

n'est prévue dans la V1.

---

## 9.4 Module — Journal d'activité

Toute action ayant un effet sur les données importantes doit être enregistrée avec :

- Date
- Heure
- Utilisateur
- Module
- Action
- Ancienne valeur lorsque pertinent
- Nouvelle valeur

## Protection du journal

Le journal :

- Ne peut pas être modifié depuis l'administration.
- Ne peut pas être supprimé depuis l'administration.

---

# 10. MODULE — SITE INTERNET & MENU DIGITAL

## 10.1 Site internet

Le site doit être responsive.

## Pages

Le site comprend :

- Accueil
- Menu
- À propos / Concept
- Galerie
- Contact / Localisation

## Informations pouvant être affichées

Le site peut afficher :

- Adresse
- Téléphone
- Horaires
- Google Maps
- Réseaux sociaux

## Fonctionnalités exclues du site V1

Ne sont pas inclus :

- Réservation en ligne
- Commande en ligne
- Paiement en ligne

---

# 10.2 Module — Menu digital

Le menu digital est :

- Directement connecté à la solution de gestion.

## Gestion depuis l'administration

L'administrateur peut gérer :

- Catégories
- Produits
- Descriptions
- Photos
- Prix
- Variantes
- Suppléments
- Disponibilités

## Synchronisation des prix

Toute modification validée du prix doit être :

- Automatiquement répercutée sur le menu digital.

## Gestion des produits indisponibles

Pour un produit indisponible, Café Noir peut choisir :

### Option 1
Masquer le produit.

### Option 2
Afficher le produit comme indisponible.

## Contenu du menu public

Le menu public comporte :

- Catégories
- Sous-catégories
- Recherche
- Photos
- Descriptions
- Variantes
- Suppléments
- Prix

## Informations internes interdites au public

Les éléments suivants ne doivent jamais être affichés publiquement :

- Coûts matière
- Marges
- Recettes
- Informations internes

## Accès au menu

Le menu est accessible :

- Depuis le site
- Par URL directe
- Via un QR Code fourni par Creative Comet

## Limitation V1

La V1 est limitée à :

- La consultation du menu

---

# 11. MODULE — INTÉGRATION INITIALE & FORMATION

## Intégration des données

L'intégration des données intervient :

- Après la livraison technique.

Creative Comet intègre les informations nécessaires au démarrage fournies par Café Noir.

## Données initiales

Les données concernées comprennent notamment :

- Menu
- Produits et prix
- Catégories
- Variantes et suppléments
- Ingrédients et recettes
- Stocks initiaux
- Fournisseurs actifs
- Employés actifs
- Seuils et paramètres disponibles

## Historique non repris

La reprise complète des :

- Anciennes ventes
- Anciennes factures
- Anciennes dépenses
- Autres historiques

n'est pas incluse.

## Responsabilité des données

Café Noir reste responsable :

- De l'exactitude des informations transmises.

## Formation

Creative Comet assure :

- Une formation initiale d'environ 2 heures
- Un guide de prise en main

---

# 12. MODULE — HÉBERGEMENT & ENVIRONNEMENT TECHNIQUE

## Type de solution

La solution est :

- Une application web responsive
- Fonctionnant sur les navigateurs modernes

## Stack technique

Le choix de la stack technique reste à la charge de :

- Creative Comet

Sous réserve du respect :

- Des fonctionnalités prévues dans le cahier des charges.

## Services pendant la période initiale

Pendant la période initiale prévue dans la Convention de collaboration sont assurés :

- Hébergement de la plateforme
- Hébergement du site
- Sauvegardes quotidiennes
- Maintenance corrective
- Assistance
- Mises à jour techniques nécessaires

## Conditions

Les conditions de :

- Durée
- Renouvellement
- Transfert

sont définies dans :

- La Convention de collaboration

---

# 13. ÉLÉMENTS HORS PÉRIMÈTRE V1

Les fonctionnalités suivantes ne sont notamment pas comprises dans la V1 :

- Gestion de plusieurs établissements
- Création de zones de stockage supplémentaires
- Comptes utilisateurs multiples
- Gestion de rôles et permissions
- Application mobile native
- Réservation en ligne
- Commande en ligne
- Paiement en ligne
- Connexion automatique temps réel à une caisse
- Pointage biométrique
- Logiciel complet de paie
- Déclarations sociales
- Notifications SMS
- Notifications WhatsApp
- Notifications email
- Reprise exhaustive des historiques passés
- Toute fonctionnalité non décrite dans le présent cahier des charges

---

# 14. VALIDATION & LIVRAISON

La solution est considérée comme techniquement livrable lorsque :

- Les modules prévus sont accessibles
- Les fonctionnalités essentielles sont opérationnelles
- Le compte administrateur fonctionne
- Le site est accessible
- Le menu digital est accessible
- La synchronisation prévue avec le menu fonctionne
- Aucun bug bloquant signalé conformément à la Convention ne subsiste

## Après livraison technique

L'intégration des données et la formation interviennent :

- Après la livraison technique.

## Recette

Les modalités de :

- Recette
- Délais de validation
- Cycles de correction

sont définies dans :

- La Convention de collaboration

---

# 15. VALIDATION DU CAHIER DES CHARGES

La signature du présent document vaut :

- Validation du périmètre fonctionnel de la V1.

Toute demande ultérieure hors de ce périmètre pourra faire l'objet :

- D'un devis complémentaire.

---

# 16. SIGNATURES

Fait à Tunis, le 17/08/2026, en deux exemplaires originaux.

## POUR CREATIVE COMET

Ste Creative Comet SARL

M. Mehdi Chekir — Gérant

## POUR CAFÉ NOIR

M. Aouled Ahmed Hatem

Exploitant de Café Noir
