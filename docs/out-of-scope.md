# Hors périmètre V1 — Liste d'exclusion (référence §13 + règles complémentaires)

> **Note sur le module Gestion des tables.** Ce module (`docs/modules/12-gestion-des-tables.md`)
> n'était pas dans le cahier des charges V1 signé. Il a été ajouté ensuite comme
> avenant explicite et suit son propre document de référence — il ne doit pas être
> confondu avec les modules originaux ci-dessous, et toute évolution demandée sur
> ce module précis relève du même traitement (avenant) que le reste.

Ce fichier existe pour qu'aucune fonctionnalité "utile mais non demandée" ne soit
ajoutée par erreur. Si une tâche ressemble à l'un des points ci-dessous : **stop,
ne pas construire, demander confirmation à l'utilisateur.**

## Exclu par le cahier des charges (§13, verbatim)

- Gestion de plusieurs établissements (multi-site)
- Création de zones de stockage supplémentaires (V1 = Réserve principale + Dépôt, figé)
- Comptes utilisateurs multiples
- Gestion de rôles et permissions
- Application mobile native (web responsive uniquement)
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
- Reprise exhaustive des historiques passés (ventes/factures/dépenses anciennes)
- Toute fonctionnalité non décrite dans le cahier des charges

## Exclu par contrainte client explicite (hors cahier des charges, ajoutée pour ce projet)

- **Toute fonctionnalité d'intelligence artificielle / LLM**, quelle que soit la
  justification (aide à la rédaction, catégorisation automatique "intelligente",
  chatbot, recommandations personnalisées, prévisions de ventes par ML,
  détection d'anomalies par ML). L'OCR des factures (§6) est explicitement une
  extraction de texte classique — jamais un appel à un modèle de langage.
- Multi-langue / sélecteur de langue (l'interface est en français uniquement, §1).
- Personnalisation de la structure du catalogue au-delà de
  Catégorie → Sous-catégorie → Produit (§3.1).
- Méthodes de valorisation de stock alternatives (FIFO, LIFO, coût standard) —
  seul le coût moyen pondéré (CMP) est prévu (§4.6).
- Blocage des opérations en cas de stock négatif — le stock négatif est autorisé,
  seule une alerte est requise (§4.2).

## Comment traiter une demande hors périmètre

1. Vérifier une deuxième fois dans `docs/cahier-des-charges.md` — la fonctionnalité
   n'y figure vraiment pas ?
2. Si confirmé hors périmètre : ne pas l'implémenter silencieusement, même
   partiellement. Répondre à l'utilisateur que le point relève d'un avenant / devis
   complémentaire (§13 et §15 du cahier des charges), et proposer de continuer sur
   le périmètre validé.
