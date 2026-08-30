# Prompt 5 — Module Tableau de bord & Ventes

Copie ce texte tel quel dans Google AI Studio une fois le prompt 4 terminé et
validé.

---

Construis le module Tableau de bord & Ventes tel que décrit dans
`docs/modules/01-dashboard-sales.md` (cahier des charges §2), intégré nativement à
la coquille Navigation Rapide et au système de design mis en place au prompt 2 —
pas de barre latérale, écrans pensés tablette d'abord.

Points fonctionnels essentiels (inchangés par rapport au cahier des charges) :

- Le tableau de bord affiche tous les indicateurs prévus (chiffre d'affaires du
  jour et du mois, achats, dépenses, valeur du stock, coût du personnel, nombre de
  tickets, panier moyen, marge estimée, produits les plus et moins vendus, produits
  générant le plus de chiffre d'affaires et de marge, principales alertes), avec
  les filtres Aujourd'hui / Hier / Semaine / Mois / Période personnalisée, la
  comparaison à la période précédente et des graphiques simples et lisibles.
- Les ventes s'enregistrent par saisie manuelle, import Excel ou import CSV, avec
  produit, variante, quantité, prix, date, nombre de tickets, mode de paiement
  (Espèces / TPE / Ticket restaurant) et type de consommation (Sur place / À
  emporter).
- Le formulaire de saisie manuelle et les imports suivent le patron obligatoire
  aperçu → confirmation avant tout enregistrement.
- Correction et annulation d'une vente restent possibles, tracées, sans jamais de
  suppression définitive.
- L'ajout d'une vente manuelle doit être accessible en un seul geste depuis
  n'importe quel écran via la Navigation Rapide ou une action rapide flottante,
  conformément au budget de clics de `docs/ux-guidelines.md`.

Présente ces indicateurs et cette saisie de vente avec des cartes visuelles claires,
des graphiques lisibles et un minimum de tableaux denses, conformément à
`docs/ui-ux-redesign.md`.

Peuple ce module avec des **données réelles et plausibles** représentatives d'un
vrai café tunisien (vrais noms de boissons et de produits courants, quantités et
prix réalistes en dinars tunisiens, plusieurs jours de ventes variées sur les
différents modes de paiement et types de consommation) — jamais de données de test
manifestement fictives.

Termine par un résumé des points de sécurité déjà couverts (contrôle d'accès,
validation des montants et quantités côté serveur, protection contre les fichiers
d'import malveillants).
