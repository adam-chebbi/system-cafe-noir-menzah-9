# Prompt 8 — Module Fournisseurs, Achats & Factures

Copie ce texte tel quel dans Google AI Studio une fois le prompt 7 terminé et
validé.

---

Construis le module Fournisseurs, Achats & Factures tel que décrit dans
`docs/modules/04-suppliers-purchases-invoices.md` (cahier des charges §5), intégré
à la Navigation Rapide et au système de design déjà en place.

Points fonctionnels essentiels :

- Fiche fournisseur complète (nom/raison sociale, matricule fiscal, téléphone,
  WhatsApp, email, adresse, contact principal, notes), un produit pouvant avoir
  plusieurs fournisseurs, avec historique des prix d'achat conservé
  automatiquement.
- Bons de commande avec statuts Brouillon, Commandée, Partiellement reçue, Reçue,
  Annulée, réceptionnables en plusieurs fois.
- Chaque réception validée augmente automatiquement le stock correspondant (en
  s'appuyant sur le module Stock déjà construit) et met à jour le coût moyen
  pondéré et l'historique des prix.
- Factures fournisseurs (liées ou non à une commande) avec fournisseur, numéro,
  date, échéance, montant HT, TVA, montant TTC, montant payé, mode de paiement, et
  statuts Non payée / Partiellement payée / Payée dérivés automatiquement.
- Identification des échéances de factures proches, exploitable par le futur
  module d'alertes.
- Prévois la structure permettant à une facture d'être créée soit manuellement,
  soit via le futur module OCR (prompt suivant), avec la même entité et le même
  écran de consultation/paiement dans les deux cas.

Présente les commandes et factures avec des cartes/panneaux visuels et des badges
de statut clairs, cohérents avec le reste de l'application.

Peuple ce module avec des **fournisseurs et documents réalistes** pour un café
tunisien (torréfacteur, fournisseur de produits laitiers, fournisseur de
pâtisseries, fournisseur d'emballages, etc.), au moins un bon de commande complet
avec réception, et au moins deux factures avec des statuts de paiement différents,
montants réalistes en dinars tunisiens et TVA correctement calculée.

Termine en rappelant les points de sécurité propres à ce module : validation
stricte des montants côté serveur, contrôle d'accès sur toutes les routes de
paiement et de commande.
