# Module 7 — Employés (cahier des charges §8)

## Fiche employé (§8)
Nom et prénom, Téléphone, Poste, Date d'entrée, Statut actif/inactif, Photo,
Salaire, Numéro CIN, Date de délivrance (de la CIN), Copie/photo de la CIN (upload
fichier).

### Formulaire — flux
`Infos personnelles (nom, téléphone, photo) → Poste + date d'entrée → Salaire →
CIN (numéro, date de délivrance, copie/photo) → Aperçu → Confirmer`.

## 7.1 Planning & présence (§8.1)

### États possibles par jour/créneau
Présent, Absent, Congé, Repos, Retard — plus les horaires prévus (planning).

### Saisie
**Manuelle uniquement.** Aucun dispositif biométrique ni matériel de pointage — ne
pas prévoir d'intégration badgeuse/empreinte, même optionnelle.

### Écran de présence du jour
Liste des employés actifs du jour avec, pour chacun, un sélecteur rapide d'état
(Présent / Absent / Congé / Repos / Retard) — objectif : marquer la présence de
toute l'équipe du jour en quelques taps (1 tap par employé pour l'état le plus
courant "Présent"). Accessible en 2 taps depuis n'importe où (voir
`ux-guidelines.md`).

### Planning (horaires prévus)
Écran séparé (moins fréquent) pour définir les horaires prévus par employé et par
jour de la semaine — sert de référence pour repérer les retards/absences, pas de
génération automatique de plannings complexes (rotation, contraintes légales) :
V1 = saisie simple des horaires prévus par créneau.

## 7.2 Suivi financier des employés (§8.2)

### À suivre par employé
Salaire de base, Avances, Primes, Retenues, Montant payé, Date de paiement.

### Formulaire de mouvement financier employé
`Employé → Type de mouvement (Avance / Prime / Retenue / Paiement) → Montant →
Date → Commentaire → Aperçu → Confirmer`.

### Coût du personnel
Calculé et affiché au tableau de bord (§2.1) : somme des salaires de base +
primes + avances non remboursées − retenues, sur la période filtrée. Formule
exacte à confirmer avec le client si un cas limite se présente (ex: comment traiter
une avance non encore remboursée dans le coût du mois) — noter l'hypothèse retenue
en commentaire de code plutôt que de bloquer le développement.

### Limitation V1 (explicite dans le cahier des charges)
**Ce n'est ni un logiciel de paie, ni un logiciel de déclaration sociale.** Ne pas
construire de bulletin de paie officiel, de calcul de cotisations sociales, de
déclarations CNSS ou fiscales. Le module reste un simple suivi financier
informatif par employé.

## Entités
- `Employe` (fiche, statut actif/inactif)
- `HoraisonPrevu` (planning par employé/jour)
- `Presence` (par employé/jour : état + horaire réel si pertinent)
- `MouvementFinancierEmploye` (type, montant, date, commentaire)
